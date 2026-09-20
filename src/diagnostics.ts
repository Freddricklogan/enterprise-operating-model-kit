/**
 * The three diagnostics, as pure functions over the model.
 */

import { DOMAINS, type Capability, type Decision, type Domain, type Objective, type OperatingModel, type Right, type Role } from './model.ts';

/* ---------------------------------------------------------- capabilities */

export interface CapabilityScore { capability: Capability; gap: number; priority: number; band: 'critical' | 'develop' | 'sustain' | 'fine' }

/**
 * gap      = target − maturity (negative when over-invested)
 * priority = importance × max(gap, 0)  — where the strategy is most exposed
 * band     critical: importance ≥ 4 and gap ≥ 2 · develop: gap ≥ 1 · sustain: gap 0 and importance ≥ 4 · fine: otherwise
 */
export function scoreCapabilities(caps: Capability[]): CapabilityScore[] {
  return caps.map((c) => {
    const gap = c.target - c.maturity;
    const priority = c.importance * Math.max(gap, 0);
    const band: CapabilityScore['band'] = c.importance >= 4 && gap >= 2 ? 'critical' : gap >= 1 ? 'develop' : c.importance >= 4 ? 'sustain' : 'fine';
    return { capability: c, gap, priority, band };
  }).sort((a, b) => b.priority - a.priority || a.capability.id.localeCompare(b.capability.id));
}

export interface DomainSummary { domain: Domain; count: number; meanMaturity: number | null; meanTarget: number | null; critical: number }

export function summarizeDomains(caps: Capability[]): DomainSummary[] {
  return DOMAINS.map((domain) => {
    const mine = caps.filter((c) => c.domain === domain);
    const scores = scoreCapabilities(mine);
    return {
      domain, count: mine.length,
      meanMaturity: mine.length ? Number((mine.reduce((a, c) => a + c.maturity, 0) / mine.length).toFixed(2)) : null,
      meanTarget: mine.length ? Number((mine.reduce((a, c) => a + c.target, 0) / mine.length).toFixed(2)) : null,
      critical: scores.filter((s) => s.band === 'critical').length
    };
  });
}

/* ----------------------------------------------------------------- RACI */

export type Letter = 'R' | 'A' | 'C' | 'I' | '';

/** Decision rights map onto RACI: decide → A, recommend → R, input → C, informed → I. */
export const RIGHT_TO_LETTER: Record<Right, Letter> = { decide: 'A', recommend: 'R', input: 'C', informed: 'I' };

export interface RaciRow { decision: Decision; letters: Record<string, Letter>; problems: string[] }

export function generateRaci(decisions: Decision[], roles: Role[]): RaciRow[] {
  return decisions.map((d) => {
    const letters: Record<string, Letter> = {};
    for (const r of roles) letters[r.id] = RIGHT_TO_LETTER[d.rights[r.id] as Right] ?? '';
    const problems: string[] = [];
    const a = Object.values(letters).filter((l) => l === 'A').length;
    const r = Object.values(letters).filter((l) => l === 'R').length;
    if (a === 0) problems.push('no one holds the decision right');
    if (a > 1) problems.push(`${a} roles hold the decision right; one must`);
    if (r === 0) problems.push('no one is responsible for the recommendation');
    for (const id of Object.keys(d.rights)) if (!roles.some((x) => x.id === id)) problems.push(`unknown role "${id}"`);
    return { decision: d, letters, problems };
  });
}

export interface RaciLoad { role: Role; decides: number; recommends: number; consulted: number; informed: number }

export function raciLoad(rows: RaciRow[], roles: Role[]): RaciLoad[] {
  return roles.map((role) => {
    const l = { decides: 0, recommends: 0, consulted: 0, informed: 0 };
    for (const row of rows) {
      const x = row.letters[role.id];
      if (x === 'A') l.decides += 1; else if (x === 'R') l.recommends += 1; else if (x === 'C') l.consulted += 1; else if (x === 'I') l.informed += 1;
    }
    return { role, ...l };
  });
}

/* ----------------------------------------------------------------- OKRs */

export interface KrProgress { id: string; progress: number | null }

/** Progress toward target from baseline, 0–1, direction-aware; null when baseline equals target. */
export function krProgress(baseline: number, target: number, current: number): number | null {
  if (target === baseline) return null;
  const p = (current - baseline) / (target - baseline);
  return Number(Math.min(Math.max(p, 0), 1).toFixed(2));
}

export interface ObjectiveNode { objective: Objective; progress: number | null; children: ObjectiveNode[]; depth: number }

export interface CascadeReport {
  tree: ObjectiveNode[];
  /** Objectives below enterprise level with no parent, or a parent that does not exist. */
  orphans: Objective[];
  /** Enterprise objectives with no contributing objective. */
  unsupported: Objective[];
  /** Objectives with no key result. */
  unmeasured: Objective[];
  /** Cycles or over-deep chains. */
  invalid: string[];
}

export function objectiveProgress(o: Objective): number | null {
  const ps = o.keyResults.map((k) => krProgress(k.baseline, k.target, k.current)).filter((p): p is number => p != null);
  return ps.length ? Number((ps.reduce((a, p) => a + p, 0) / ps.length).toFixed(2)) : null;
}

export function buildCascade(objectives: Objective[]): CascadeReport {
  const byId = new Map(objectives.map((o) => [o.id, o]));
  const orphans = objectives.filter((o) => o.level !== 'enterprise' && (!o.parentId || !byId.has(o.parentId)));
  const invalid: string[] = [];
  const childrenOf = (id: string | null, depth: number, seen: Set<string>): ObjectiveNode[] =>
    objectives.filter((o) => o.parentId === id && byId.has(o.id) && !(o.level !== 'enterprise' && !o.parentId)).map((o) => {
      if (seen.has(o.id) || depth > 4) { invalid.push(`${o.id}: cycle or chain deeper than four levels`); return { objective: o, progress: objectiveProgress(o), children: [], depth }; }
      const next = new Set(seen); next.add(o.id);
      return { objective: o, progress: objectiveProgress(o), children: childrenOf(o.id, depth + 1, next), depth };
    });
  const roots = objectives.filter((o) => o.level === 'enterprise').map((o) => ({ objective: o, progress: objectiveProgress(o), children: childrenOf(o.id, 1, new Set([o.id])), depth: 0 }));
  const unsupported = roots.filter((r) => r.children.length === 0).map((r) => r.objective);
  const unmeasured = objectives.filter((o) => o.keyResults.length === 0);
  return { tree: roots, orphans, unsupported, unmeasured, invalid };
}

/* ----------------------------------------------------------- validation */

export function validateModel(m: OperatingModel): string[] {
  const p: string[] = [];
  const roleIds = new Set(m.roles.map((r) => r.id));
  if (new Set(m.roles.map((r) => r.id)).size !== m.roles.length) p.push('role ids must be unique');
  for (const c of m.capabilities) {
    if (!c.name.trim()) p.push(`capability ${c.id}: name is required`);
    if (!DOMAINS.includes(c.domain)) p.push(`capability ${c.id}: unknown domain`);
    for (const k of ['importance', 'maturity', 'target'] as const) if (!Number.isInteger(c[k]) || c[k] < 1 || c[k] > 5) p.push(`capability ${c.id}: ${k} must be an integer 1–5`);
    if (c.owner && !roleIds.has(c.owner)) p.push(`capability ${c.id}: unknown owner "${c.owner}"`);
  }
  for (const d of m.decisions) {
    if (!d.name.trim()) p.push(`decision ${d.id}: name is required`);
    for (const [role, right] of Object.entries(d.rights)) {
      if (!roleIds.has(role)) p.push(`decision ${d.id}: unknown role "${role}"`);
      if (!['decide', 'recommend', 'input', 'informed'].includes(right)) p.push(`decision ${d.id}: unknown right "${right}"`);
    }
  }
  for (const o of m.objectives) {
    if (!o.text.trim()) p.push(`objective ${o.id}: text is required`);
    if (!['enterprise', 'division', 'team'].includes(o.level)) p.push(`objective ${o.id}: unknown level`);
    if (o.owner && !roleIds.has(o.owner)) p.push(`objective ${o.id}: unknown owner "${o.owner}"`);
    for (const k of o.keyResults) for (const f of ['baseline', 'target', 'current'] as const) if (!Number.isFinite(k[f])) p.push(`key result ${k.id}: ${f} must be a number`);
  }
  return p;
}

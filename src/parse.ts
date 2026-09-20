/** Untrusted JSON → OperatingModel, dropping invalid parts with warnings; never throws. */

import type { Capability, Decision, Domain, KeyResult, Objective, OperatingModel, Right, Role } from './model.ts';
import { validateModel } from './diagnostics.ts';

const asText = (v: unknown, max = 200): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').replace(/\s+/g, ' ').trim().slice(0, max);
const num = (v: unknown): number => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

export function parseModel(input: unknown): { model: OperatingModel | null; warnings: string[] } {
  const warnings: string[] = [];
  let raw: unknown = input;
  if (typeof input === 'string') { try { raw = JSON.parse(input); } catch { return { model: null, warnings: ['Not valid JSON.'] }; } }
  if (!isObj(raw)) return { model: null, warnings: ['Not an operating-model object.'] };
  const roles: Role[] = (Array.isArray(raw['roles']) ? raw['roles'] : []).filter(isObj).map((r) => ({ id: asText(r['id'], 40), name: asText(r['name'], 80) })).filter((r) => r.id && r.name);
  const capabilities: Capability[] = (Array.isArray(raw['capabilities']) ? raw['capabilities'] : []).filter(isObj).map((c, i) => ({
    id: asText(c['id'], 40) || `c-${i + 1}`, name: asText(c['name'], 120), domain: asText(c['domain'], 20) as Domain,
    importance: num(c['importance']), maturity: num(c['maturity']), target: num(c['target']), owner: asText(c['owner'], 40)
  }));
  const decisions: Decision[] = (Array.isArray(raw['decisions']) ? raw['decisions'] : []).filter(isObj).map((d, i) => {
    const rights: Record<string, Right> = {};
    if (isObj(d['rights'])) for (const [k, v] of Object.entries(d['rights'])) rights[asText(k, 40)] = asText(v, 20) as Right;
    return { id: asText(d['id'], 40) || `d-${i + 1}`, name: asText(d['name'], 160), domain: asText(d['domain'], 20) as Domain, rights };
  });
  const objectives: Objective[] = (Array.isArray(raw['objectives']) ? raw['objectives'] : []).filter(isObj).map((o, i) => ({
    id: asText(o['id'], 40) || `o-${i + 1}`, level: asText(o['level'], 20) as Objective['level'], owner: asText(o['owner'], 40), text: asText(o['text'], 240),
    parentId: o['parentId'] == null ? null : asText(o['parentId'], 40) || null,
    keyResults: (Array.isArray(o['keyResults']) ? o['keyResults'] : []).filter(isObj).map((k, j): KeyResult => ({ id: asText(k['id'], 40) || `k-${i + 1}-${j + 1}`, text: asText(k['text'], 200), baseline: num(k['baseline']), target: num(k['target']), current: num(k['current']), unit: asText(k['unit'], 20) }))
  }));
  const model: OperatingModel = { name: asText(raw['name'], 120) || 'Untitled operating model', roles, capabilities, decisions, objectives };
  const problems = validateModel(model);
  if (problems.length) {
    // Drop the offending items rather than the whole model.
    const bad = new Set(problems.map((p) => p.split(':')[0] ?? ''));
    model.capabilities = model.capabilities.filter((c) => !bad.has(`capability ${c.id}`));
    model.decisions = model.decisions.filter((d) => !bad.has(`decision ${d.id}`));
    model.objectives = model.objectives.filter((o) => !bad.has(`objective ${o.id}`) && !o.keyResults.some((k) => bad.has(`key result ${k.id}`)));
    warnings.push(...problems.map((p) => `${p}; item dropped.`));
  }
  return { model, warnings };
}

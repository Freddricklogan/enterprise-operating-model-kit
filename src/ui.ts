/** DOM rendering — textContent and createElement only. */

import { DOMAIN_LABEL, DOMAINS, type Capability, type OperatingModel, type Role } from './model.ts';
import type { CapabilityScore, CascadeReport, DomainSummary, ObjectiveNode, RaciLoad, RaciRow } from './diagnostics.ts';

type Props = Record<string, string | number | boolean | null | undefined>;
export function el(tag: string, props: Props = {}, kids: Array<Node | string | null | undefined> = []): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'text') node.textContent = String(v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids) if (kid != null) node.append(kid);
  return node;
}
export function clear(node: Element): void { while (node.firstChild) node.removeChild(node.firstChild); }
const BAND_LABEL = { critical: 'Critical gap', develop: 'Develop', sustain: 'Sustain', fine: 'Fine' } as const;

export function renderHeatmap(host: HTMLElement, model: OperatingModel, scores: CapabilityScore[], onEdit: (id: string, field: 'importance' | 'maturity' | 'target', value: number) => void): void {
  clear(host);
  const byId = new Map(scores.map((s) => [s.capability.id, s]));
  const roles = new Map(model.roles.map((r) => [r.id, r.name]));
  for (const domain of DOMAINS) {
    const caps = model.capabilities.filter((c) => c.domain === domain);
    const col = el('section', { class: 'eom-domain', 'aria-labelledby': `dom-${domain}` }, [el('h4', { id: `dom-${domain}`, class: 'eom-domain__title', text: DOMAIN_LABEL[domain] })]);
    if (!caps.length) col.append(el('p', { class: 'eom-muted', text: 'No capability recorded.' }));
    for (const c of caps) {
      const s = byId.get(c.id)!;
      const cell = el('div', { class: 'eom-cell', 'data-band': s.band, 'data-maturity': String(c.maturity) }, [
        el('div', { class: 'eom-cell__name', text: c.name }),
        el('div', { class: 'eom-cell__meta', text: `${roles.get(c.owner) ?? c.owner} · ${BAND_LABEL[s.band]} · priority ${s.priority}` })
      ]);
      const ctrls = el('div', { class: 'eom-cell__ctrls' });
      for (const [field, label] of [['importance', 'Imp'], ['maturity', 'Now'], ['target', 'Target']] as const) {
        const id = `cap-${c.id}-${field}`;
        const input = el('input', { type: 'number', id, min: '1', max: '5', step: '1', value: String(c[field]), 'aria-label': `${c.name} ${field}` }) as HTMLInputElement;
        input.addEventListener('change', () => onEdit(c.id, field, Number(input.value)));
        ctrls.append(el('label', { for: id }, [label, input]));
      }
      cell.append(ctrls);
      col.append(cell);
    }
    host.append(col);
  }
}

export function renderDomainSummary(host: HTMLElement, rows: DomainSummary[]): void {
  clear(host);
  host.append(el('thead', {}, [el('tr', {}, ['Domain', 'Capabilities', 'Mean maturity', 'Mean target', 'Critical gaps'].map((h) => el('th', { scope: 'col', text: h })))]));
  const body = el('tbody');
  for (const r of rows) body.append(el('tr', {}, [el('th', { scope: 'row', text: DOMAIN_LABEL[r.domain] }), el('td', { text: String(r.count) }), el('td', { text: r.meanMaturity == null ? '—' : r.meanMaturity.toFixed(1) }), el('td', { text: r.meanTarget == null ? '—' : r.meanTarget.toFixed(1) }), el('td', { 'data-tone': r.critical ? 'danger' : 'ok', text: String(r.critical) })]));
  host.append(body);
}

export function renderPriorities(host: HTMLElement, scores: CapabilityScore[]): void {
  clear(host);
  scores.filter((s) => s.priority > 0).slice(0, 5).forEach((s, i) => host.append(el('li', {}, [el('strong', { text: `${i + 1}. ${s.capability.name}` }), el('span', { class: 'eom-muted', text: ` — ${DOMAIN_LABEL[s.capability.domain]}, importance ${s.capability.importance}, maturity ${s.capability.maturity} → ${s.capability.target}, priority ${s.priority}` })])));
  if (!host.childElementCount) host.append(el('li', { class: 'eom-muted', text: 'No capability gaps.' }));
}

export function renderRaci(tableHost: HTMLElement, problemsHost: HTMLElement, loadHost: HTMLElement, rows: RaciRow[], roles: Role[], load: RaciLoad[]): void {
  clear(tableHost); clear(problemsHost); clear(loadHost);
  tableHost.append(el('thead', {}, [el('tr', {}, [el('th', { scope: 'col', text: 'Decision' }), ...roles.map((r) => el('th', { scope: 'col', text: r.name }))])]));
  const body = el('tbody');
  for (const row of rows) {
    body.append(el('tr', { class: row.problems.length ? 'is-invalid' : '' }, [
      el('th', { scope: 'row', text: row.decision.name }),
      ...roles.map((r) => { const l = row.letters[r.id] ?? ''; return el('td', {}, [l ? el('span', { class: 'eom-raci', 'data-letter': l, text: l, 'aria-label': { R: 'Responsible (recommends)', A: 'Accountable (decides)', C: 'Consulted (input)', I: 'Informed' }[l] }) : el('span', { class: 'eom-muted', text: '–' })]); })
    ]));
  }
  tableHost.append(body);
  const problems = rows.filter((r) => r.problems.length);
  if (!problems.length) problemsHost.append(el('li', { class: 'eom-finding', 'data-tone': 'ok', text: 'Every decision has exactly one decider and at least one recommender.' }));
  for (const r of problems) for (const p of r.problems) problemsHost.append(el('li', { class: 'eom-finding', 'data-tone': 'danger', text: `${r.decision.name}: ${p}.` }));
  for (const l of load) loadHost.append(el('li', { text: `${l.role.name}: decides ${l.decides} · recommends ${l.recommends} · consulted ${l.consulted} · informed ${l.informed}` }));
}

export function renderCascade(host: HTMLElement, findingsHost: HTMLElement, report: CascadeReport, roles: Role[]): void {
  clear(host); clear(findingsHost);
  const roleName = (id: string): string => roles.find((r) => r.id === id)?.name ?? id;
  const render = (node: ObjectiveNode): HTMLElement => {
    const o = node.objective;
    const li = el('li', { class: `eom-obj eom-obj--${o.level}` }, [
      el('div', { class: 'eom-obj__head' }, [
        el('span', { class: 'eom-obj__level', text: o.level }),
        el('span', { class: 'eom-obj__text', text: o.text }),
        el('span', { class: 'eom-obj__owner', text: roleName(o.owner) }),
        el('span', { class: 'eom-obj__prog', 'data-tone': node.progress == null ? 'muted' : node.progress >= 0.7 ? 'ok' : node.progress >= 0.3 ? 'warn' : 'danger', text: node.progress == null ? 'no KR' : `${Math.round(node.progress * 100)}%` })
      ]),
      el('ul', { class: 'eom-krs' }, o.keyResults.map((k) => el('li', { text: `${k.text}: ${k.baseline} → ${k.current} (target ${k.target} ${k.unit})` })))
    ]);
    if (node.children.length) li.append(el('ul', { class: 'eom-tree' }, node.children.map(render)));
    return li;
  };
  host.append(...report.tree.map(render));
  if (!report.orphans.length && !report.unsupported.length && !report.unmeasured.length && !report.invalid.length) findingsHost.append(el('li', { class: 'eom-finding', 'data-tone': 'ok', text: 'Every objective contributes to an enterprise objective and carries a key result.' }));
  for (const o of report.orphans) findingsHost.append(el('li', { class: 'eom-finding', 'data-tone': 'danger', text: `"${o.text}" (${roleName(o.owner)}) contributes to nothing above it.` }));
  for (const o of report.unsupported) findingsHost.append(el('li', { class: 'eom-finding', 'data-tone': 'warn', text: `Enterprise objective "${o.text}" has no contributing objective.` }));
  for (const o of report.unmeasured) findingsHost.append(el('li', { class: 'eom-finding', 'data-tone': 'warn', text: `"${o.text}" has no key result.` }));
  for (const m of report.invalid) findingsHost.append(el('li', { class: 'eom-finding', 'data-tone': 'danger', text: m }));
}

export function capabilityById(model: OperatingModel, id: string): Capability | undefined {
  return model.capabilities.find((c) => c.id === id);
}

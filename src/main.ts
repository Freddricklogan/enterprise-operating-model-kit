/** Entry point. */

import './shell/exec-shell.css';
import './app.css';
import { mountExecShell } from './shell/exec-shell.js';
import { sample, type OperatingModel } from './model.ts';
import { buildCascade, generateRaci, raciLoad, scoreCapabilities, summarizeDomains } from './diagnostics.ts';
import { parseModel } from './parse.ts';
import { capabilityById, renderCascade, renderDomainSummary, renderHeatmap, renderPriorities, renderRaci } from './ui.ts';

const REPO = 'https://github.com/Freddricklogan/enterprise-operating-model-kit';
const PAGES = 'https://freddricklogan.github.io/enterprise-operating-model-kit/';
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => { const n = document.getElementById(id); if (!n) throw new Error(`Missing #${id}`); return n as T; };

const state: { model: OperatingModel } = { model: sample() };
function setStatus(text: string, tone: 'ok' | 'warn' | 'danger' | 'muted' = 'muted'): void { const s = $('status'); s.textContent = text; s.dataset['tone'] = tone; }

function render(): void {
  const m = state.model;
  $('model-name').textContent = m.name;
  const scores = scoreCapabilities(m.capabilities);
  renderHeatmap($('heatmap'), m, scores, editCapability);
  renderDomainSummary($('domains'), summarizeDomains(m.capabilities));
  renderPriorities($('priorities'), scores);
  const rows = generateRaci(m.decisions, m.roles);
  renderRaci($('raci'), $('raci-problems'), $('raci-load'), rows, m.roles, raciLoad(rows, m.roles));
  renderCascade($('cascade'), $('cascade-findings'), buildCascade(m.objectives), m.roles);
  shell.refreshKpis();
}

function editCapability(id: string, field: 'importance' | 'maturity' | 'target', value: number): void {
  const c = capabilityById(state.model, id);
  if (!c) return;
  if (!Number.isInteger(value) || value < 1 || value > 5) { setStatus('Scores must be integers 1–5.', 'danger'); render(); return; }
  c[field] = value;
  setStatus(`${c.name}: ${field} set to ${value}; heat-map, bands and priorities recomputed.`, 'ok');
  render();
}

function download(filename: string, body: string): void { const url = URL.createObjectURL(new Blob([body], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
$('btn-export').addEventListener('click', () => download('operating-model.json', JSON.stringify(state.model, null, 2)));
$('btn-import').addEventListener('click', () => $<HTMLInputElement>('file-import').click());
$<HTMLInputElement>('file-import').addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement; const file = input.files?.[0]; input.value = '';
  if (!file) return;
  file.text().then((text) => {
    const { model, warnings } = parseModel(text);
    if (!model) { setStatus(`Import failed: ${warnings[0] ?? 'not an operating model.'}`, 'danger'); return; }
    state.model = model;
    setStatus(warnings.length ? `Imported with ${warnings.length} warning(s): ${warnings[0]}` : `Imported "${model.name}".`, warnings.length ? 'warn' : 'ok');
    render();
  }).catch(() => setStatus('Import failed: could not read the file.', 'danger'));
});
$('btn-reset').addEventListener('click', () => { state.model = sample(); setStatus('Sample operating model restored.', 'ok'); render(); });
$('btn-print').addEventListener('click', () => window.print());

const shell = mountExecShell({
  theme: 'midnight',
  title: 'Enterprise Operating Model Kit',
  tagline: 'Three instruments for the first ninety days — a capability heat-map scored on importance, maturity and target; a RACI chart generated from decision rights and checked; and an OKR cascade whose alignment is verified rather than assumed. With the playbook below. Sample organisation; illustrative.',
  repo: REPO, pagesUrl: PAGES,
  badges: [{ label: 'Diagnostics, not slides', tone: 'accent' }, { label: 'Generated RACI', dot: true }, { label: 'Client-side only', dot: true }],
  kpis: [
    { label: 'Capabilities', compute: () => state.model.capabilities.length, tone: 'accent' },
    { label: 'Critical gaps', compute: () => scoreCapabilities(state.model.capabilities).filter((s) => s.band === 'critical').length, tone: 'danger' },
    { label: 'Decisions', compute: () => state.model.decisions.length },
    { label: 'RACI problems', compute: () => generateRaci(state.model.decisions, state.model.roles).filter((r) => r.problems.length).length, tone: 'warn' },
    { label: 'Orphan objectives', compute: () => buildCascade(state.model.objectives).orphans.length, tone: 'warn' }
  ],
  tour: [
    { selector: '#heatmap', title: 'Where the strategy is exposed', body: 'Thirteen capabilities across six domains, each scored for importance, current maturity and the target the strategy needs. Priority is importance × gap; a critical band means the strategy leans on something that is not there yet.', action: () => { $('btn-reset').click(); } },
    { selector: '#priorities', title: 'The first five moves', body: 'Ranked by priority. Enrollment forecasting, student advising at scale and the learning analytics platform tie at 10 — importance 5, two maturity levels short of target.', action: () => {} },
    { selector: '#raci', title: 'RACI generated from decision rights', body: 'Decide → A, recommend → R, input → C, informed → I. Because the chart is generated, it can be checked: the academic-calendar decision has two recommenders and nobody who decides.', action: () => {} },
    { selector: '#cascade', title: 'A cascade that is verified', body: 'Every objective must contribute to one above it and carry a key result. The registrar\'s scheduling objective contributes to nothing — it may be worth doing, but it is not part of this strategy.', action: () => {} },
    { selector: 'input[aria-label="Enrollment forecasting maturity"]', title: 'Close a gap and watch the map', body: 'This raises enrollment forecasting from maturity 2 to 4. The critical band clears, the priority list re-ranks and the domain summary updates — the diagnostic is live, not a slide.', action: () => editCapability('c1', 'maturity', 4) }
  ]
});

render();
setStatus('Sample operating model loaded. Edit any capability score; import your own model as JSON.');

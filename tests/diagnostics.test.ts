import { describe, it, expect } from 'vitest';
import { buildCascade, generateRaci, krProgress, objectiveProgress, raciLoad, scoreCapabilities, summarizeDomains, validateModel } from '../src/diagnostics.ts';
import { sample, type Objective } from '../src/model.ts';

const m = sample();

describe('capabilities', () => {
  it('scores gap, priority and band, ordered by priority', () => {
    const s = scoreCapabilities(m.capabilities);
    for (let i = 1; i < s.length; i += 1) expect(s[i - 1]!.priority).toBeGreaterThanOrEqual(s[i]!.priority);
    const by = Object.fromEntries(s.map((x) => [x.capability.id, x]));
    expect(by['c1']).toMatchObject({ gap: 2, priority: 10, band: 'critical' });
    expect(by['c5']).toMatchObject({ gap: 0, priority: 0, band: 'fine' });
    expect(by['c13']).toMatchObject({ gap: 0, band: 'sustain' });
    expect(by['c6']).toMatchObject({ gap: 1, band: 'develop' });
    expect(scoreCapabilities([{ ...m.capabilities[0]!, maturity: 5, target: 3 }])[0]!.gap).toBe(-2);
  });
  it('summarises domains', () => {
    const d = summarizeDomains(m.capabilities);
    expect(d).toHaveLength(6);
    const tech = d.find((x) => x.domain === 'technology')!;
    expect(tech.count).toBe(3);
    expect(tech.meanMaturity).toBeCloseTo(8 / 3, 2);
    expect(tech.critical).toBe(1);
    expect(summarizeDomains([])[0]!.meanMaturity).toBeNull();
  });
});

describe('RACI generation', () => {
  it('maps rights to letters and finds the sample decision with nobody accountable', () => {
    const rows = generateRaci(m.decisions, m.roles);
    const d1 = rows.find((r) => r.decision.id === 'd1')!;
    expect(d1.letters['pres']).toBe('A'); expect(d1.letters['provost']).toBe('R'); expect(d1.letters['deans']).toBe('C'); expect(d1.letters['registrar']).toBe('I'); expect(d1.letters['hr']).toBe('');
    expect(d1.problems).toEqual([]);
    const d5 = rows.find((r) => r.decision.id === 'd5')!;
    expect(d5.problems).toEqual(['no one holds the decision right']);
  });
  it('flags two deciders, no recommender and unknown roles', () => {
    const rows = generateRaci([{ id: 'x', name: 'X', domain: 'strategy', rights: { pres: 'decide', cfo: 'decide', ghost: 'input' } }], m.roles);
    expect(rows[0]!.problems).toEqual(['2 roles hold the decision right; one must', 'no one is responsible for the recommendation', 'unknown role "ghost"']);
  });
  it('load per role', () => {
    const load = raciLoad(generateRaci(m.decisions, m.roles), m.roles);
    expect(load.find((l) => l.role.id === 'provost')).toMatchObject({ decides: 3, recommends: 2, consulted: 1 });
  });
});

describe('OKR cascade', () => {
  it('progress is direction-aware and clamped', () => {
    expect(krProgress(18, 60, 31)).toBeCloseTo(0.31, 2);
    expect(krProgress(180, 5, 40)).toBe(0.8);
    expect(krProgress(0, 10, 15)).toBe(1);
    expect(krProgress(10, 0, 12)).toBe(0);
    expect(krProgress(5, 5, 5)).toBeNull();
  });
  it('builds the tree, finds orphans, unsupported and unmeasured', () => {
    const r = buildCascade(m.objectives);
    expect(r.tree).toHaveLength(1);
    expect(r.tree[0]!.children.map((c) => c.objective.id).sort()).toEqual(['o2', 'o4']);
    expect(r.tree[0]!.children.find((c) => c.objective.id === 'o2')!.children[0]!.objective.id).toBe('o3');
    expect(r.orphans.map((o) => o.id)).toEqual(['o5']);
    expect(r.unsupported).toEqual([]);
    expect(r.unmeasured).toEqual([]);
    expect(r.invalid).toEqual([]);
    expect(objectiveProgress(m.objectives[0]!)).toBeCloseTo((0.31 + 0.19) / 2, 2);
  });
  it('detects unsupported enterprise objectives, unmeasured objectives and cycles', () => {
    const objs: Objective[] = [
      { id: 'e', level: 'enterprise', owner: 'pres', text: 'E', parentId: null, keyResults: [] },
      { id: 'a', level: 'division', owner: 'cio', text: 'A', parentId: 'b', keyResults: [] },
      { id: 'b', level: 'team', owner: 'cio', text: 'B', parentId: 'a', keyResults: [] }
    ];
    const r = buildCascade(objs);
    expect(r.unsupported.map((o) => o.id)).toEqual(['e']);
    expect(r.unmeasured).toHaveLength(3);
    expect(r.orphans).toEqual([]);
    expect(objectiveProgress(objs[0]!)).toBeNull();
  });
});

describe('validateModel', () => {
  it('accepts the sample and reports problems', () => {
    expect(validateModel(m)).toEqual([]);
    const bad = sample();
    bad.capabilities[0]!.importance = 7; bad.capabilities[1]!.owner = 'nobody'; bad.decisions[0]!.rights['ghost'] = 'decide'; bad.objectives[0]!.keyResults[0]!.target = NaN;
    const p = validateModel(bad);
    expect(p).toHaveLength(4);
  });
});

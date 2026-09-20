import { describe, it, expect } from 'vitest';
import { parseModel } from '../src/parse.ts';
import { sample } from '../src/model.ts';

describe('parseModel', () => {
  it('round-trips the sample', () => {
    const r = parseModel(JSON.stringify(sample()));
    expect(r.warnings).toEqual([]);
    expect(r.model).toEqual(sample());
  });
  it('rejects non-JSON and non-objects', () => {
    expect(parseModel('{').model).toBeNull();
    expect(parseModel('[]').model).toBeNull();
  });
  it('drops invalid items with warnings and keeps the rest', () => {
    const raw = { name: 'x', roles: [{ id: 'a', name: 'A' }, 'junk'], capabilities: [{ id: 'c1', name: 'ok', domain: 'strategy', importance: 3, maturity: 3, target: 3, owner: 'a' }, { id: 'c2', name: 'bad', domain: 'nope', importance: 3, maturity: 3, target: 3 }], decisions: [{ id: 'd', name: 'D', domain: 'strategy', rights: { a: 'decide', zz: 'input' } }], objectives: [{ id: 'o', level: 'team', owner: 'a', text: 'T', parentId: null, keyResults: [{ id: 'k', text: 'k', baseline: 'x', target: 1, current: 0, unit: '' }] }] };
    const r = parseModel(raw);
    expect(r.model!.roles).toHaveLength(1);
    expect(r.model!.capabilities.map((c) => c.id)).toEqual(['c1']);
    expect(r.model!.decisions).toEqual([]);
    expect(r.model!.objectives).toEqual([]);
    expect(r.warnings).toHaveLength(3);
  });
});

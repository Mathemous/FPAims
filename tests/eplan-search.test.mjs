import test from 'node:test';
import assert from 'node:assert/strict';
import { searchRecords, groupMatches, narrativeExcerpt } from '../lib/search.mjs';

const a = { id:'a',sourceId:'123',program:'title-4',account:'71100',line:'429',category:'Instruction',subcategory:'Supplies',item:'Supplies',narrative:'School A: paper.\n\nGrace Christian Academy: CPR training and books.' };
test('full imported narratives are searchable across schools and materials', () => {
  assert.equal(searchRecords([a], 'Grace CPR').length, 1);
  assert.equal(searchRecords([a], 'missing123').length, 0);
  assert.match(narrativeExcerpt(a.narrative, 'CPR'), /Grace Christian Academy/);
});
test('separate source narratives with the same account and label are not merged', () => {
  const b = {...a,id:'b',sourceId:'124',narrative:'School B: paint.'};
  const groups = groupMatches([a,b]);
  assert.equal(groups.length, 2);
  assert.equal(groups[1].item.narrative, b.narrative);
});

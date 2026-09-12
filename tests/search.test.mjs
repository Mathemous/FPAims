import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { programs, searchRecords, groupMatches } from '../lib/search.mjs';
const records = JSON.parse(
  fs.readFileSync(new URL('../data/records.json', import.meta.url), 'utf8'),
);
const meta = JSON.parse(fs.readFileSync(new URL('../data/eplan-meta.json', import.meta.url), 'utf8'));

test('all five programs match the validated published counts', () => {
  assert.ok(records.length > 0);
  assert.deepEqual(
    programs.map((p) => records.filter((r) => r.program === p.id).length),
    programs.map((p) => meta.recordCounts[p.id]),
  );
  assert.equal(new Set(records.map((r) => r.id)).size, records.length);
  assert.ok(records.every((r) => programs.some((p) => p.id === r.program)));
  assert.ok(records.every((r) => r.item && r.account && r.category));
  assert.ok(records.every((r) => !('recipient' in r)));
});
test('case, punctuation and singular/plural variations find the same materials', () => {
  assert.deepEqual(
    searchRecords(records, 'BOOKS'),
    searchRecords(records, 'book'),
  );
  assert.deepEqual(
    searchRecords(records, 'cpr-training'),
    searchRecords(records, 'CPR training'),
  );
  assert.ok(searchRecords(records, 'books').length > 0);
});
test('cross-program results preserve program restrictions', () => {
  const fixture = [{program:'title-4',item:'CPR training'},{program:'title-1-a',item:'Paper'}];
  const hits = searchRecords(fixture, 'CPR training');
  assert.equal(hits.filter((r) => r.program === 'title-1-a').length, 0);
  assert.deepEqual([...new Set(hits.map((r) => r.program))], ['title-4']);
});
test('no-match and all-record browsing states', () => {
  assert.equal(searchRecords(records, 'qzxvnotpresent987').length, 0);
  assert.equal(searchRecords(records, '').length, records.length);
  assert.equal(searchRecords(records, '   ').length, records.length);
});
test('multiple words must match and equivalent item entries group together', () => {
  const seed = records[0];
  const fixture = [
    { ...seed, id: 'a', item: 'Art brushes' },
    { ...seed, id: 'b', item: 'Art brushes' },
    { ...seed, id: 'c', item: 'Art paper' },
  ];
  assert.equal(searchRecords(fixture, 'art brushes').length, 2);
  const groups = groupMatches(fixture);
  assert.equal(groups.length, 2);
  assert.equal(
    groups.reduce((n, g) => n + g.count, 0),
    fixture.length,
  );
});

test('search never replaces the entered spelling', () => {
  const seed = { ...records[0], subcategory: '', category: '' };
  const fixture = ['Filler paper', 'Filled notebooks', 'Keyboard'].map(
    (item) => ({ ...seed, item }),
  );
  assert.deepEqual(
    searchRecords(fixture, 'filler').map((r) => r.item),
    ['Filler paper'],
  );
  assert.deepEqual(searchRecords(fixture, 'keebored'), []);
  assert.deepEqual(searchRecords(records, 'keebored'), []);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sourceContext } from '../lib/source-context.mjs';
const read = name => JSON.parse(fs.readFileSync(new URL('../data/' + name, import.meta.url), 'utf8'));
const records = read('records.json');
const source = read('eplan-source.json');
const details = read('mobile-details.json');
test('cardstock is assigned to New Pathways and the source typo to Lake Brook', () => {
  const cardstock = details['title-1-neglected-9'];
  assert.equal(cardstock[0].sourceId, '11142147');
  assert.deepEqual(cardstock[0].associations.map(a=>[a.school,a.category]), [['New Pathways','Classroom Supplies']]);
  const typo = details['title-1-neglected-10'];
  assert.deepEqual(typo[0].associations.map(a=>a.school), ['Lake Brook Academy']);
  assert.equal(typo[0].associations[0].excerpt,'Cardstodk');
});
test('mobile details remain reproducible from the source and preserve program/account boundaries', () => {
  for (const record of records) {
    assert.deepEqual(details[record.id], sourceContext(record, source.rows));
    for (const link of details[record.id]) {
      const row = source.rows.find(r=>r.sourceId===link.sourceId);
      assert.ok(row);
      assert.equal(row.program,record.program);
      assert.equal(row.account,record.account);
      assert.equal(row.line,record.line);
      for (const association of link.associations) assert.ok(row.narrative.includes(association.excerpt));
    }
  }
});
test('no school is carried across revision boundaries or inferred for unmatched items', () => {
  const item = {program:'p',account:'71100',line:'429',item:'Cardstock'};
  const rows = [{...item,sourceId:'s',narrative:'School A - $10\nPaper\nRevision 1\nCardstock'}];
  assert.deepEqual(sourceContext(item,rows)[0].associations,[]);
  assert.deepEqual(sourceContext({...item,item:'Markers'},rows),[]);
});

import { locationBlurb } from '../lib/source-context.mjs';
test('family engagement blurbs retain the correct named school and purpose', () => {
  const row = source.rows.find(r => r.sourceId === '11146445');
  const links = sourceContext({program:row.program,account:row.account,line:row.line,item:'Markers'}, [row]);
  const sacred = links[0].associations.find(a=>a.school==='Sacred Heart');
  const joseph = links[0].associations.find(a=>a.school==='St. Joseph');
  assert.equal(locationBlurb(sacred.excerpt), 'Supplies for family engagement events');
  assert.equal(locationBlurb(joseph.excerpt), "Supplies for Fall and Spring family engagement events for Tutoring Students' Families");
});

import { normalize } from './search.mjs';

// Match catalog phrases only within the same program, account and line item.
// Preserve source spelling and avoid assigning a school from a neighboring block.
export function sourceContext(item, rows) {
  const sourceSpelling = item.item.match(/\(source:\s*([^)]*)\)/i)?.[1];
  const phrases = (sourceSpelling ? [sourceSpelling] : item.item.replace(/\s*\([^)]*\)/g, '').split(/\s+\/\s+/))
    .map(normalize).filter(Boolean);
  const mentions = text => phrases.some(phrase => (` ${normalize(text)} `).includes(` ${phrase} `));
  const candidates = rows.filter(row => row.program === item.program && row.account === item.account && row.line === item.line &&
    (item.sourceId ? row.sourceId === item.sourceId : mentions(row.narrative || '')));
  return candidates.map(row => {
    const narrative = row.narrative || '';
    const associations = [];
    let school = null;
    for (const raw of narrative.split(/\r?\n/)) {
      const line = raw.trim();
      if (/^(?:FY\d+ Original Budget|Revision\s+\d+)/i.test(line)) school = null;
      const heading = line.match(/^(.+?)\s*[-–—]\s*\$[\d,]+(?:\.\d+)?\s*$/);
      if (heading) { school = heading[1].trim(); continue; }
      if (!school || !mentions(line)) continue;
      const category = line.match(/^([^:–—]+?)\s*(?:\s-\s|:|\s[–—]\s)/)?.[1]?.trim();
      if (!associations.some(a => a.school === school && a.excerpt === line))
        associations.push({ school, ...(category ? { category } : {}), excerpt: line });
    }
    return { sourceId: row.sourceId, associations };
  });
}

// Keep a short source-derived purpose statement; the dialog retains the full text.
export function locationBlurb(excerpt) {
  const purpose = excerpt.split(/\s+including\s+|;\s*supplies include|;\s*materials include/i)[0].trim();
  if (purpose.length <= 180) return purpose.replace(/[;,:]$/, '');
  return purpose.slice(0, 177).replace(/\s+\S*$/, '') + '…';
}

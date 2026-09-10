export const programs = [
  { id: 'title-1-a', name: 'Title I, Part A' },
  { id: 'title-1-neglected', name: 'Title I, Part A–Neglected' },
  { id: 'title-1-d', name: 'Title I, Part D' },
  { id: 'title-2-a', name: 'Title II, Part A' },
  { id: 'title-4', name: 'Title IV' },
];
export function normalize(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
const equivalents = {
  supplies: 'supply',
  materials: 'material',
  services: 'service',
  books: 'book',
  fees: 'fee',
  classes: 'class',
  children: 'child',
  pd: 'development',
};
function token(value) {
  return (
    equivalents[value] ||
    (value.length > 4 && value.endsWith('s') ? value.slice(0, -1) : value)
  );
}
export function searchRecords(records, query) {
  const terms = normalize(query).split(' ').filter(Boolean).map(token);
  if (!terms.length) return [...records];
  return records.filter((r) => {
    const words = normalize(
      [r.item, r.subcategory, r.category, r.account, r.line, r.recipient].join(
        ' ',
      ),
    )
      .split(' ')
      .map(token);
    return terms.every((t) => words.some((w) => w.includes(t)));
  });
}
export function groupMatches(records) {
  const groups = new Map();
  for (const item of records) {
    const key = [
      item.program,
      item.account,
      item.subcategory,
      item.item,
      item.line,
    ].join('|');
    if (!groups.has(key))
      groups.set(key, { key, item, recipients: [], count: 0 });
    const group = groups.get(key);
    group.count++;
    if (!group.recipients.includes(item.recipient))
      group.recipients.push(item.recipient);
  }
  return [...groups.values()];
}

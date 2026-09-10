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

// Build suggestions from catalog language, never from an external service.
const dictionaries = new WeakMap();
function dictionaryFor(records) {
  if (dictionaries.has(records)) return dictionaries.get(records);
  const known = new Set();
  const candidates = new Set();
  for (const row of records) {
    for (const word of normalize(
      [row.item, row.subcategory, row.category, row.recipient].join(' '),
    ).split(' '))
      known.add(token(word));
    for (const word of normalize(row.item + ' ' + row.subcategory).split(' ')) {
      const stem = token(word);
      if (/^[a-z]{4,}$/.test(stem)) {
        candidates.add(stem);
        candidates.add(word);
      }
    }
  }
  const dictionary = { known, candidates: [...candidates] };
  dictionaries.set(records, dictionary);
  return dictionary;
}
function editDistance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
    }
  return matrix[a.length][b.length];
}
function phonetic(word) {
  const codes = {
    b: 1,
    f: 1,
    p: 1,
    v: 1,
    c: 2,
    g: 2,
    j: 2,
    k: 2,
    q: 2,
    s: 2,
    x: 2,
    z: 2,
    d: 3,
    t: 3,
    l: 4,
    m: 5,
    n: 5,
    r: 6,
  };
  let result = word[0],
    previous = codes[word[0]] || 0;
  for (const char of word.slice(1)) {
    const code = codes[char] || 0;
    if (code && code !== previous) result += code;
    previous = code;
  }
  return result.padEnd(4, '0').slice(0, 4);
}
export function resolveSearch(records, query, { correct = true } = {}) {
  const original = searchRecords(records, query);
  if (!correct || original.length || !query.trim())
    return { rows: original, correction: null };
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length > 8) return { rows: original, correction: null };
  const dictionary = dictionaryFor(records);
  let changed = false;
  const revised = words
    .map((word) => {
      const stem = token(word);
      if (!/^[a-z]{4,24}$/.test(stem) || dictionary.known.has(stem))
        return word;
      const limit = stem.length >= 8 ? 3 : stem.length >= 6 ? 2 : 1;
      const options = dictionary.candidates
        .flatMap((candidate) => {
          if (Math.abs(candidate.length - stem.length) > limit) return [];
          const distance = Math.min(
            editDistance(stem, candidate),
            editDistance(word, candidate),
          );
          if (!distance || distance > limit) return [];
          // Distant spellings need phonetic agreement, e.g. keebored -> keyboard.
          const sameSound = phonetic(stem) === phonetic(candidate);
          if (distance === 3 && !sameSound) return [];
          return [{ candidate, score: distance - (sameSound ? 0.2 : 0) }];
        })
        .sort((a, b) => a.score - b.score);
      const distinct = options.filter(
        (option, index) =>
          options.findIndex(
            (other) => token(other.candidate) === token(option.candidate),
          ) === index,
      );
      if (
        !distinct.length ||
        (distinct[1] && distinct[1].score - distinct[0].score < 0.15)
      )
        return word;
      changed = true;
      return distinct[0].candidate;
    })
    .join(' ');
  if (!changed) return { rows: original, correction: null };
  const rows = searchRecords(records, revised);
  return rows.length
    ? { rows, correction: revised }
    : { rows: original, correction: null };
}

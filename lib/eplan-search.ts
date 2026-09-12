const searchableFields = [
  'account',
  'category',
  'line',
  'subcategory',
  'narrative',
  'organization',
  'organizationCode',
  'programCode',
  'tags',
] as const;

type EplanSearchRow = Partial<Record<(typeof searchableFields)[number], string | number | null>>;

export function matchesEplanQuery(row: EplanSearchRow, query: string) {
  const term = query.trim().toLowerCase();
  return searchableFields.map(field => row[field] ?? '').join(' ').toLowerCase().includes(term);
}

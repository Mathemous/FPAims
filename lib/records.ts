import stored from '@/data/records.json';

export type RecordEntry = {
  id: string;
  program: string;
  account: string;
  category: string;
  subcategory: string;
  item: string;
  line: string;
  recipient: string;
  narrative?: string;
  sourceId?: string;
};

const records: RecordEntry[] = stored;
export default records;

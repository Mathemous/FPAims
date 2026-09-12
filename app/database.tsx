import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { programs, searchRecords } from '@/lib/search.mjs';
import records from '@/data/records.json';

const pageSize = 50;
const programNames = Object.fromEntries(programs.map((p) => [p.id, p.name]));

export default function Database() {
  const [program, setProgram] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => searchRecords(records, keyword).filter(
    (record: (typeof records)[number]) => program === 'all' || record.program === program,
  ), [program, keyword]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const start = currentPage * pageSize;
  const displayed = filtered.slice(start, start + pageSize);
  return (
    <div className="app database-view">
      <header className="app-header">
        <div className="header-inner">
          <a href="#" className="brand compact" aria-label="FP AIMS home">
            <span>FP <strong>AIMS</strong></span>
            <p>Approved Items, Materials &amp; Services</p>
          </a>
          <a href="#search" className="database-back"><ArrowLeft size={17} /> Search</a>
        </div>
      </header>
      <main className="workspace">
        <div className="page-title">
          <h1>Database<span>.</span></h1>
          <p>{records.length.toLocaleString()} stored entries across five programs. FY 2027 · Revision 1.</p>
        </div>
        <p className="database-source">Source: Knox County Schools ePlan budget narratives, transcribed from the original workbook. This view shows the app’s stored data, not a live ePlan feed. Repeated items remain separate when their source entries differ.</p>
        <div className="database-filters">
          <label>Program
            <select value={program} onChange={(e) => { setProgram(e.target.value); setPage(0); }}>
              <option value="all">All programs</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>Search records
            <input type="search" value={keyword} placeholder="Item, recipient, account, or category" maxLength={150} onChange={(e) => { setKeyword(e.target.value); setPage(0); }} />
          </label>
        </div>
        <div className="database-pagination">
          <p aria-live="polite">{filtered.length ? `${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length.toLocaleString()} entries` : 'No matching entries'}</p>
          <div>
            <button type="button" aria-label="Previous page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={18} /></button>
            <span>Page {currentPage + 1} of {pages}</span>
            <button type="button" aria-label="Next page" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="database-table-wrap" role="region" aria-label="Database records, scroll horizontally for all fields" tabIndex={0}>
          <table className="database-table">
            <caption className="sr-only">Stored FP AIMS database records</caption>
            <thead><tr>{['Program', 'Item or service', 'Recipient / set-aside', 'Narrative subcategory', 'Account', 'Line item', 'Budget category', 'Record ID'].map((heading) => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
            <tbody>{displayed.map((record: (typeof records)[number]) => <tr key={record.id}>
              <td>{programNames[record.program]}</td><td>{record.item}</td><td>{record.recipient}</td><td>{record.subcategory}</td><td>{record.account}</td><td>{record.line}</td><td>{record.category}</td><td>{record.id}</td>
            </tr>)}{!displayed.length && <tr><td colSpan={8}>No matching entries. Try another keyword or program.</td></tr>}</tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

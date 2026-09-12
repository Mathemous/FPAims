import { useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import source from '@/data/eplan-source.json';

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function Eplan() {
  const [program, setProgram] = useState(source.programs[0].id);
  const [query, setQuery] = useState('');
  const selectedProgram = source.programs.find(item => item.id === program)!;
  const rows = useMemo(() => source.rows.filter(row => row.program === program &&
    [row.account, row.category, row.line, row.subcategory, row.narrative, row.organization, row.organizationCode, row.programCode, row.tags]
      .join(' ').toLowerCase().includes(query.trim().toLowerCase())), [program, query]);

  return <div className="app database-view eplan-view">
    <header className="app-header"><div className="header-inner">
      <a href="#" className="brand compact" aria-label="FP AIMS home"><span>FP <strong>AIMS</strong></span></a>
      <a href="#search" className="database-back"><ArrowLeft size={17} /> Item search</a>
    </div></header>
    <main className="workspace">
      <div className="eplan-heading">
        <div className="page-title"><h1>Knox County ePlan Budget<span>.</span></h1>
          <p>{source.district} ({source.districtCode}) · FY {source.year} · {source.application} ({source.applicationDate}) · Revision {source.revision}</p>
        </div>
        <div className="eplan-source-stamp"><span>Selected application</span><strong>{source.application} {source.applicationDate}</strong><small>{source.status}</small></div>
      </div>
      <nav className="eplan-links" aria-label="Budget navigation"><a href="#database">Individual item database</a><a href="https://eplan.tn.gov/Search/DistrictSearch.aspx" target="_blank" rel="noopener noreferrer">Open ePlan organization search <ExternalLink size={14} /></a></nav>
      <p className="eplan-link-path"><strong>In ePlan:</strong> Knox County Schools → FA → FY {source.year} → Approved Applications → {source.application} {source.applicationDate}</p>
      <div className="database-filters">
        <label>Program<select value={program} onChange={e => { setProgram(e.target.value); setQuery(''); }}>
          {source.programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></label>
        <label>Find in this program<input type="search" value={query} maxLength={150} onChange={e => setQuery(e.target.value)} placeholder="Narrative, school, account, or line item" /></label>
      </div>
      <p className="eplan-count" aria-live="polite">{rows.length} budget detail rows for {selectedProgram.name}{query.trim() ? ' matching your search' : ''}</p>
      <div className="eplan-detail-list">
        {rows.map(row => <article className="eplan-detail" key={row.sourceId}>
          <div className="eplan-detail-head"><strong>Budget Detail</strong><strong>Narrative Description</strong></div>
          <div className="eplan-detail-body">
            <dl className="eplan-budget-fields">
              <div><dt>Account Number:</dt><dd>{row.account} - {row.category}</dd></div>
              <div><dt>Line Item Number:</dt><dd>{row.line} - {row.subcategory}</dd></div>
              <div><dt>Budget Tags:</dt><dd>{row.tags || '—'}</dd></div>
              <div><dt>Optional Program Code:</dt><dd>{row.programCode || '—'}</dd></div>
              <div><dt>Location Code:</dt><dd>{row.organization} ({row.organizationCode || 'not specified'})</dd></div>
              <div><dt>Cost:</dt><dd className="eplan-money">{dollars.format(Number(row.total))}</dd></div>
              <div><dt>Line Item Total:</dt><dd className="eplan-money">{dollars.format(Number(row.total))}</dd></div>
              <div><dt>Source Row:</dt><dd>{row.sourceId}</dd></div>
              <div><dt>Last Updated:</dt><dd>{row.updatedAt || 'Not specified'}</dd></div>
            </dl>
            <div className="eplan-narrative">
              <p className="source-narrative">{row.narrative || 'No narrative provided in the source export.'}</p>
            </div>
          </div>
        </article>)}
        {!rows.length && <p className="eplan-empty">No budget rows match. Try another phrase or program.</p>}
      </div>
      <p className="eplan-source-note">Saved public ePlan export checked {new Date(source.checkedAt).toLocaleString()}. The application date above identifies the selected approved Consolidated application.</p>
    </main>
  </div>;
}

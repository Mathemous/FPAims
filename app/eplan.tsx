import { useMemo, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import source from '@/data/eplan-source.json';
import { matchesEplanQuery } from '@/lib/eplan-search';

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const displayProgramName = (id: string, name: string) => {
  if (id === 'title-2-a') return 'Title II';
  if (id === 'title-1-d') return 'Title I, Part D';
  return name;
};

type EplanProps = {
  program: string;
  query: string;
  onProgramChange: (program: string) => void;
  onQueryChange: (query: string) => void;
};

export default function Eplan({ program, query, onProgramChange, onQueryChange }: EplanProps) {
  const [expandedNarratives, setExpandedNarratives] = useState<Set<string>>(new Set());
  const selectedProgram = source.programs.find(item => item.id === program)!;
  const matchingRows = useMemo(() => source.rows.filter(row => matchesEplanQuery(row, query)), [query]);
  const rows = useMemo(() => matchingRows.filter(row => row.program === program), [matchingRows, program]);
  const resultCounts = useMemo(() => Object.fromEntries(source.programs.map(item =>
    [item.id, matchingRows.filter(row => row.program === item.id).length]
  )), [matchingRows]);
  const expandableRows = rows.filter(row => {
    const narrative = row.narrative || 'No narrative provided in the source export.';
    return narrative.length > 650 || narrative.split('\n').length > 12;
  });
  const allExpanded = expandableRows.length > 0 && expandableRows.every(row => expandedNarratives.has(row.sourceId));
  const highlight = (value: string | number) => {
    const text = String(value);
    const term = query.trim();
    if (!term) return text;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.split(new RegExp(`(${escaped})`, 'gi')).map((part, index) =>
      part.toLowerCase() === term.toLowerCase() ? <mark className="eplan-highlight" key={index}>{part}</mark> : part
    );
  };

  return <div className="app database-view eplan-view">
    <header className="app-header"><div className="header-inner">
      <a href="#" className="brand compact" aria-label="Federal Programs ePlan Search home"><span>Federal Programs <strong>ePlan Search</strong></span></a>
    </div></header>
    <main className="workspace eplan-workspace">
      <aside className="eplan-sidebar search-panel">
        <div className="page-title"><h1>Knox County ePlan Budget<span>.</span></h1>
          <p>{source.district} ({source.districtCode}) · FY {source.year} · {source.application} ({source.applicationDate}) · Revision {source.revision}</p>
        </div>
        <div className="program-field">
          <span className="program-label">Programs</span>
          <div className="program-buttons" role="group" aria-label="ePlan programs">
            {source.programs.map((p, index) => <button key={p.id} type="button" className={`program-touch${index === 0 ? ' program-touch-centered' : ''}${program === p.id ? ' is-selected' : ''}`} aria-pressed={program === p.id} onClick={() => onProgramChange(p.id)}>
              {displayProgramName(p.id, p.name)}<span className="program-entry-count">{resultCounts[p.id]} {query.trim() ? (resultCounts[p.id] === 1 ? 'result' : 'results') : (resultCounts[p.id] === 1 ? 'section' : 'sections')}</span>
            </button>)}
          </div>
        </div>
        <label className="eplan-search-field">Find in this program
          <span className="input-wrap"><Search size={21} /><input type="search" value={query} maxLength={150} onChange={e => onQueryChange(e.target.value)} placeholder="Narrative, school, account…" /></span>
        </label>
        <nav className="eplan-links" aria-label="Budget navigation"><a href="https://eplan.tn.gov/Search/DistrictSearch.aspx" target="_blank" rel="noopener noreferrer">Open ePlan <ExternalLink size={14} /></a></nav>
      </aside>
      <section className="eplan-results" aria-label="ePlan budget details">
      <div className="eplan-results-toolbar">
        <p className="eplan-count" aria-live="polite">{rows.length} budget detail rows for {displayProgramName(selectedProgram.id, selectedProgram.name)}{query.trim() ? ' matching your search' : ''}</p>
        {expandableRows.length > 0 && <button type="button" onClick={() => setExpandedNarratives(current => {
          const next = new Set(current);
          expandableRows.forEach(row => allExpanded ? next.delete(row.sourceId) : next.add(row.sourceId));
          return next;
        })}>{allExpanded ? 'Collapse all' : 'Expand all'}</button>}
      </div>
      <div className="eplan-results-scroll">
      <div className="eplan-detail-list">
        {rows.map(row => {
          const narrative = row.narrative || 'No narrative provided in the source export.';
          const isLong = narrative.length > 650 || narrative.split('\n').length > 12;
          const isExpanded = expandedNarratives.has(row.sourceId);
          return <article className="eplan-detail" key={row.sourceId}>
          <div className="eplan-detail-head"><strong>Budget Detail</strong><strong>Narrative Description</strong></div>
          <div className="eplan-detail-body">
            <dl className="eplan-budget-fields">
              <div><dt>Account Number:</dt><dd>{highlight(`${row.account} - ${row.category}`)}</dd></div>
              <div><dt>Line Item Number:</dt><dd>{highlight(`${row.line} - ${row.subcategory}`)}</dd></div>
              <div><dt>Budget Tags:</dt><dd>{highlight(row.tags || '—')}</dd></div>
              <div><dt>Optional Program Code:</dt><dd>{highlight(row.programCode || '—')}</dd></div>
              <div><dt>Location Code:</dt><dd>{highlight(`${row.organization} (${row.organizationCode || 'not specified'})`)}</dd></div>
              <div><dt>Cost:</dt><dd className="eplan-money">{dollars.format(Number(row.total))}</dd></div>
              <div><dt>Line Item Total:</dt><dd className="eplan-money">{dollars.format(Number(row.total))}</dd></div>
              <div><dt>Source Row:</dt><dd>{row.sourceId}</dd></div>
              <div><dt>Last Updated:</dt><dd>{row.updatedAt || 'Not specified'}</dd></div>
            </dl>
            <div className="eplan-narrative">
              <p className={`source-narrative${isLong && !isExpanded ? ' is-collapsed' : ''}`}>{highlight(narrative)}</p>
              {isLong && <button type="button" className="eplan-narrative-toggle" aria-expanded={isExpanded} onClick={() => setExpandedNarratives(current => {
                const next = new Set(current);
                if (isExpanded) next.delete(row.sourceId); else next.add(row.sourceId);
                return next;
              })}>{isExpanded ? 'Show less' : 'Show full narrative'}</button>}
            </div>
          </div>
        </article>})}
        {!rows.length && <p className="eplan-empty">No budget rows match. Try another phrase or program.</p>}
      </div>
      <p className="eplan-source-note">Saved public ePlan export checked {new Date(source.checkedAt).toLocaleString()}. The application date above identifies the selected approved Consolidated application.</p>
      </div>
      </section>
    </main>
  </div>;
}

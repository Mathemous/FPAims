import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Check,
  Minus,
  BookOpen,
  ChevronDown,
  X,
} from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { programs, searchRecords, groupMatches, narrativeHighlights } from '@/lib/search.mjs';
import records from '@/lib/records';
import mobileDetails from '@/data/mobile-details.json';
import { locationBlurb } from '@/lib/source-context.mjs';
import source from '@/data/eplan-meta.json';
import eplanSource from '@/data/eplan-source.json';

import Database from './database';
import Eplan from './eplan';
type Item = (typeof records)[number];
const usesPhoneLayout = () => window.matchMedia('(max-width: 900px)').matches;
function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'brand compact' : 'brand'}>
      <span>
        {compact ? <>Federal Programs <strong>ePlan Search</strong></> : <><span className="brand-name-line">Federal Programs</span><br /><strong>ePlan Search</strong></>}
      </span>
      <i />
      <p>Approved Items, Materials &amp; Services</p>
    </div>
  );
}
const shortPrograms: Record<string, string> = {
  'title-1-a': '1A', 'title-1-neglected': '1A Neglected',
  'title-1-d': '1D', 'title-2-a': 'II A', 'title-4': 'IV',
};
type MobileSource = { sourceId: string; associations: { school: string; category?: string; excerpt: string }[] };
const detailsById = mobileDetails as Record<string, MobileSource[]>;
const narrativesById = new Map(eplanSource.rows.map(row => [row.sourceId, row]));
const budgetDollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
function BudgetSourceFields({ row }: { row: (typeof eplanSource.rows)[number] }) {
  const amount = row.total && Number.isFinite(Number(row.total)) ? budgetDollars.format(Number(row.total)) : '—';
  const fields = [
    ['Account Number', row.account + ' - ' + row.category],
    ['Line Item Number', row.line + ' - ' + row.subcategory],
    ['Budget Tags', row.tags || '—'],
    ['Optional Program Code', row.programCode || '—'],
    ['Location Code', row.organization + ' (' + row.organizationCode + ')'],
    ['Cost', amount],
    ['Line Item Total', amount],
    ['Source Row', row.sourceId],
    ['Last Updated', row.updatedAt || '—'],
  ];
  return <><dl className="budget-source-fields">{fields.map(([label,value]) => <div key={label}><dt>{label}:</dt><dd>{value}</dd></div>)}</dl><p className="budget-amount-note">Amounts apply to the full source budget line.</p></>;
}
function MatchCard({ item, count, query, otherProgram = false }: { item: Item; count: number; query: string; otherProgram?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const detailsId = React.useId();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const linked = detailsById[item.id] || [];
  const sources = linked.flatMap(link => {
    const row = narrativesById.get(link.sourceId);
    return row ? [{ ...link, row }] : [];
  });
  const associations = sources.flatMap(s => s.associations).filter((a, i, all) =>
    all.findIndex(b => b.school === a.school && b.excerpt === a.excerpt) === i);
  const schools = [...new Set(associations.map(a => a.school))];
  const categories = [...new Set(associations.flatMap(a => a.category ? [a.category] : []))];
  return (
    <article className={`match-card ${otherProgram ? 'other-program-card' : ''}`}>
      <div className="item-icon"><BookOpen size={21} /></div>
      <div className="match-content">
        <div className="match-card-top">
          <span className="eyebrow">{categories.length === 1 ? categories[0] : item.subcategory}</span>
          <span className="match-program" aria-label={programs.find(p => p.id === item.program)?.name}>{shortPrograms[item.program]}</span>
        </div>
        <h3>{item.item}</h3>
        {schools.length > 0 && <p className="match-schools">{schools.slice(0, 2).join(' · ')}{schools.length > 2 ? ' + ' + (schools.length - 2) + ' more' : ''}</p>}
        <div className="account-line"><p className="account">{item.account} · {item.category}</p><span className="line-item-short">LI: {item.line}</span></div>
        <div className="match-actions">
          <button type="button" className="source-details-toggle" aria-expanded={detailsOpen} aria-controls={detailsId} onClick={() => setDetailsOpen(!detailsOpen)}>Source details <ChevronDown size={16} /></button>
          {sources.length > 0 && <button type="button" className="read-narrative" onClick={() => dialogRef.current?.showModal()}>Read full narrative</button>}
        </div>
          <div id={detailsId} className="details-content" hidden={!detailsOpen}>
            {sources.length ? sources.map(({row, associations: locations}) => <section className="budget-source-section" key={row.sourceId}>
              {locations.length > 0 && <div className="source-location-list">{locations.map((a, i) => <p key={i}><strong>{a.school}:</strong> {locationBlurb(a.excerpt)}</p>)}</div>}
              <BudgetSourceFields row={row} />
            </section>) : <p><strong>Line item:</strong> {item.line}</p>}
            <p>{count} database {count === 1 ? 'entry' : 'entries'} · FY {source.year} · Revision {source.revision}</p>
          </div>
        {sources.length > 0 && <>
          <dialog className="narrative-dialog" ref={dialogRef} aria-labelledby={titleId}>
            <div className="narrative-dialog-header">
              <div><span className="eyebrow">{shortPrograms[item.program]} · Full narrative</span><h2 id={titleId}>{item.item}</h2></div>
              <button type="button" aria-label="Close full narrative" onClick={() => dialogRef.current?.close()} autoFocus><X size={24} /></button>
            </div>
            <div className="narrative-dialog-body">
              {sources.map(({row}) => <section key={row.sourceId}>
                <BudgetSourceFields row={row} />
                <p className="source-narrative">{narrativeHighlights(row.narrative, query).map((part: {text: string; match: boolean}, index: number) => part.match ? <mark className="narrative-match" key={index}>{part.text}</mark> : part.text)}</p>
              </section>)}
            </div>
          </dialog>
        </>}
      </div>
    </article>
  );
}
export default function Home() {
  const [entered, setEntered] = useState(() => usesPhoneLayout() && (location.hash === '#search' || location.hash === '#eplan'));
  const [databaseOpen, setDatabaseOpen] = useState(() => location.hash === '#database');
  const [eplanOpen, setEplanOpen] = useState(() => !usesPhoneLayout() && (location.hash === '#eplan' || location.hash === '#search'));
  const [program, setProgram] = useState('title-1-a');
  const [word, setWord] = useState('');
  const [query, setQuery] = useState<string | null>(null);
  const [visible, setVisible] = useState(30);
  const [searchEditable, setSearchEditable] = useState(false);
  const appRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null),
    inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const phoneLayout = window.matchMedia('(max-width: 900px)');
    const sync = () => {
      const searchRoute = location.hash === '#search' || location.hash === '#eplan';
      setEntered(phoneLayout.matches && searchRoute);
      setDatabaseOpen(location.hash === '#database');
      setEplanOpen(!phoneLayout.matches && searchRoute);
    };
    window.addEventListener('hashchange', sync);
    phoneLayout.addEventListener('change', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      phoneLayout.removeEventListener('change', sync);
    };
  }, []);
  // Restored iPhone sessions must not summon the keyboard without user intent.
  useEffect(() => {
    const dismiss = () => {
      inputRef.current?.blur();
      setSearchEditable(false);
    };
    const visibility = () => {
      if (document.hidden) dismiss();
    };
    const keyboardNavigation = (event: KeyboardEvent) => {
      if (event.key === 'Tab') setSearchEditable(true);
    };
    window.addEventListener('pagehide', dismiss);
    window.addEventListener('pageshow', dismiss);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('keydown', keyboardNavigation);
    return () => {
      window.removeEventListener('pagehide', dismiss);
      window.removeEventListener('pageshow', dismiss);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('keydown', keyboardNavigation);
    };
  }, []);
  useEffect(() => {
    if (query === null) {
      inputRef.current?.blur();
      setSearchEditable(false);
    }
  }, [entered, query]);
  function activateSearch() {
    flushSync(() => setSearchEditable(true));
    inputRef.current?.focus();
  }
  useLayoutEffect(() => {
    const header = headerRef.current;
    const app = appRef.current;
    if (!entered || !header || !app) return;
    const measure = () =>
      app.style.setProperty(
        '--app-header-height',
        header.getBoundingClientRect().height + 'px',
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, [entered]);
  const current = programs.find((p) => p.id === program)!;
  const matching = useMemo(
    () => (query === null ? [] : searchRecords(records, query)),
    [query],
  );
  const programEntryCounts = useMemo(() => {
    const entries = word.trim() ? groupMatches(searchRecords(records, word)).map((group: { item: Item }) => group.item) : eplanSource.rows;
    return Object.fromEntries(
      programs.map((p) => [p.id, entries.filter(row => row.program === p.id).length]),
    );
  }, [word]);
  const own = matching.filter((r: Item) => r.program === program),
    groups = groupMatches(own);
  const alternatives = programs
    .filter((p) => p.id !== program)
    .map((p) => ({
      ...p,
      rows: matching.filter((r: Item) => r.program === p.id),
    }))
    .filter((p) => p.rows.length > 0);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    inputRef.current?.blur();
    setQuery(word.trim());
    setVisible(30);
    setTimeout(
      () =>
        !appRef.current?.classList.contains('search-view') && resultsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        }),
      50,
    );
  }
  function changeProgram(value: string) {
    setProgram(value);
    setVisible(30);
  }
  const noResults = query !== null && matching.length === 0;
  const searchForm = (
    <form onSubmit={submit}>
      <div className="program-field">
        <span id="program-label" className="program-label">
          Title 1 Programs
        </span>
        <ToggleGroup
          className="program-buttons"
          value={[program]}
          onValueChange={(values) => {
            if (values.length) changeProgram(String(values[0]));
          }}
          aria-labelledby="program-label"
        >
          {programs.map((p, index) => (
            <ToggleGroupItem
              key={p.id}
              value={p.id}
              type="button"
              aria-label={p.name}
              aria-describedby={`entries-${p.id}`}
              className={`program-touch ${index === 0 ? 'program-touch-centered' : ''} ${program === p.id ? 'is-selected' : ''}`}
            >
              {p.id === 'title-1-neglected' ? (
                <span>
                  Title I, Part A<br />
                  <strong>Neglected</strong>
                </span>
              ) : (
                p.name
              )}
              <span id={`entries-${p.id}`} className="program-entry-count">
                {programEntryCounts[p.id]}{' '}
                {word.trim() ? (programEntryCounts[p.id] === 1 ? 'result' : 'results') : (programEntryCounts[p.id] === 1 ? 'section' : 'sections')}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <a href="#eplan" className="database-link">ePlan budgets</a>
      </div>
      <div className="search-field">
        <label htmlFor="search">Item or service</label>
        <div className="input-wrap">
          <Search size={21} />
          <input
            id="search"
            ref={inputRef}
            readOnly={!searchEditable}
            onPointerDown={activateSearch}
            onClick={activateSearch}
            onFocus={(e) => {
              if (!searchEditable) e.currentTarget.blur();
            }}
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Try books, paint, training…"
            type="search"
            autoComplete="off"
            autoCorrect="off"
            maxLength={150}
          />
          {word && (
            <button
              type="button"
              className="clear-button"
              aria-label="Clear search"
              onClick={() => {
                setWord('');
                activateSearch();
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>
      <button className="primary-button" type="submit">
        Search <ArrowRight size={20} />
      </button>
    </form>
  );
  if (eplanOpen) return <Eplan program={program} query={word} onProgramChange={setProgram} onQueryChange={(value) => {
    setWord(value);
    setQuery(value.trim() || null);
  }} />;
  if (databaseOpen) return <Database />;
  if (!entered)
    return (
      <main className="welcome">
        <div className="welcome-glow" />
        <div className="welcome-inner">
          <img
            className="kcs-watermark"
            src="/kcs-logo.jpg"
            alt="Knox County Schools"
          />
          <div className="welcome-brand">
            <Brand />
            <p className="federal-label">Federal Programs</p>
          </div>
          <section className="welcome-card">
            <div className="search-medallion">
              <Search size={40} strokeWidth={1.6} />
            </div>
            <h1>Find what you need.</h1>
            <p>
              Explore materials and services
              <br className="desktop-break" /> across five Federal Programs.
            </p>
            <a
              className="primary-button eplan-entry-button"
              href="#eplan"
              onClick={() => {
                setQuery(null);
              }}
            >
              Enter Federal Programs ePlan Search <ArrowRight size={22} />
            </a>
          </section>
        </div>
      </main>
    );
  return (
    <div
      ref={appRef}
      className={`app ${query === null || noResults ? 'search-view' : 'results-view'} ${noResults ? 'search-miss' : ''}`}
    >
      <header ref={headerRef} className="app-header">
        <div className="header-inner">
          <a
            href="#"
            className="brand-link"
            aria-label="Federal Programs ePlan Search home"
            onClick={() => setEntered(false)}
          >
            <Brand compact />
          </a>
          <span className="edition">
            PUBLIC RESOURCE DIRECTORY<span>FY {source.year} · Revision {source.revision}</span>
          </span>
        </div>
      </header>
      <main className="workspace" ref={workspaceRef}>
        <div className="page-title search-intro">
          <a className="back-link" href="#" onClick={() => setEntered(false)}>
            <ArrowLeft size={16} /> Home
          </a>
          <h1>
            Find what you need<span>.</span>
          </h1>
          <p>Materials and services, organized by program.</p>
          {noResults && (
            <div className="search-miss-message result-status not-found" role="status">
              <Minus size={21} />
              <div>No results found for “{query}” in any program.</div>
            </div>
          )}
        </div>
        <div className="workspace-grid">
          <aside className="search-panel">{searchForm}</aside>
          <section
            className="results-panel"
            aria-label="Search results"
            ref={resultsRef}
          >
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {query !== null
                ? `${own.length} matches in ${current.name}. Matches in ${alternatives.length} other programs.`
                : 'Select a program and search to get started.'}
            </div>
            {query === null || noResults ? null : (
              <>
                <button
                  className="edit-search"
                  onClick={() => {
                    setQuery(null);
                    workspaceRef.current?.scrollTo({
                      top: 0,
                      behavior: 'instant',
                    });
                  }}
                >
                  <ArrowLeft size={24} /> Back to search
                </button>
                {!noResults && (
                  <div className="results-heading">
                    <h2>{query ? <>Results for “{query}”</> : current.name}</h2>
                  </div>
                )}
                <div
                  className={`result-status ${own.length ? 'found' : 'not-found'}`}
                >
                  {own.length ? <Check size={21} /> : <Minus size={21} />}
                  <div>
                    <h3>
                      {noResults
                        ? `No results found for “${query}” in any program.`
                        : own.length
                        ? `${groups.length} ${groups.length === 1 ? 'match' : 'matches'} in ${current.name}`
                        : `Not found in ${current.name}`}
                    </h3>
                    {!noResults && (
                      <p>
                        {own.length
                          ? 'Listed in the program’s budget narratives.'
                          : 'No matching entry in this program’s current list.'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="match-list">
                  {groups
                    .slice(0, visible)
                    .map(
                      (g: {
                        key: string;
                        item: Item;
                        count: number;
                      }) => (
                        <MatchCard
                          key={g.key}
                          item={g.item}
                          count={g.count}
                          otherProgram={g.item.program !== program}
                          query={query}
                        />
                      ),
                    )}
                </div>
                {groups.length > visible && (
                  <button
                    className="load-more"
                    onClick={() => setVisible((v) => v + 30)}
                  >
                    Show more ({groups.length - visible} remaining){' '}
                    <ChevronDown size={18} />
                  </button>
                )}
                {alternatives.length > 0 && (
                  <section className="alternatives">
                    <h2>
                      <Check size={22} /> Also listed in {alternatives.length}{' '}
                      other {alternatives.length === 1 ? 'program' : 'programs'}
                    </h2>
                    <div className="alternative-grid">
                      {alternatives.map((p) => {
                        const grouped = groupMatches(p.rows);
                        return (
                          <article key={p.id} className={`alternative-card ${p.id !== program ? 'other-program-card' : ''}`}>
                            <h3>{p.name}</h3>
                            <div className="match-preview-row">
                              <span className="match-preview-count">{grouped.length} {grouped.length === 1 ? 'match' : 'matches'}:</span>
                              <div className="match-preview-box">
                                <ul>{grouped.slice(0, 2).map((g: {key: string; item: Item}) => <li key={g.key}>{g.item.item}</li>)}</ul>
                                {grouped.length > 2 && <span className="match-preview-more">+{grouped.length - 2} more</span>}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setProgram(p.id);
                                setVisible(30);
                                !appRef.current?.classList.contains('search-view') && resultsRef.current?.scrollIntoView({
                                  behavior: 'smooth',
                                });
                              }}
                            >
                              View program results <ArrowRight size={17} />
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

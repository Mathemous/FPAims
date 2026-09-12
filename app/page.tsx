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
import { programs, searchRecords, groupMatches, narrativeExcerpt } from '@/lib/search.mjs';
import records from '@/lib/records';
import source from '@/data/eplan-meta.json';
import Database from './database';
import Eplan from './eplan';
type Item = (typeof records)[number];
function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'brand compact' : 'brand'}>
      <span>
        FP <strong>AIMS</strong>
      </span>
      <i />
      <p>Approved Items, Materials &amp; Services</p>
    </div>
  );
}
function MatchCard({
  item,
  count,
  query,
}: {
  item: Item;
  count: number;
  query: string;
}) {
  return (
    <article className="match-card">
      <div className="item-icon">
        <BookOpen size={21} />
      </div>
      <div className="match-content">
        <span className="eyebrow">{item.subcategory}</span>
        <h3>{item.item}</h3>
        {item.narrative && <p className="narrative-excerpt">{narrativeExcerpt(item.narrative, query)}</p>}
        <p className="account">
          {item.account} · {item.category}
        </p>
        <details>
          <summary>
            Source details <ChevronDown size={16} />
          </summary>
          <div className="details-content">
            {item.narrative && <>
              <p><strong>Original ePlan narrative</strong> · Source {item.sourceId}</p>
              <p className="source-narrative">{item.narrative}</p>
              <p>Use the original narrative above for any named location, institution, or set-aside.</p>
            </>}
            <p>
              <strong>Line item:</strong> {item.line}
            </p>
            <p><a href="#eplan">Review full ePlan budget detail</a></p>
            <p>
              {count} database {count === 1 ? 'entry' : 'entries'} · FY {source.year} ·
              Revision {source.revision}
            </p>
          </div>
        </details>
      </div>
    </article>
  );
}
export default function Home() {
  const [entered, setEntered] = useState(() => location.hash === '#search');
  const [databaseOpen, setDatabaseOpen] = useState(() => location.hash === '#database');
  const [eplanOpen, setEplanOpen] = useState(() => location.hash === '#eplan');
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
    const sync = () => {
      setEntered(location.hash === '#search');
      setDatabaseOpen(location.hash === '#database');
      setEplanOpen(location.hash === '#eplan');
    };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
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
    const entries = searchRecords(records, word);
    return Object.fromEntries(
      programs.map((p) => [p.id, entries.filter((r: Item) => r.program === p.id).length]),
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
        resultsRef.current?.scrollIntoView({
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
          aria-describedby="program-count"
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
              {programEntryCounts && (
                <span id={`entries-${p.id}`} className="program-entry-count">
                  {programEntryCounts[p.id]}{' '}
                  {programEntryCounts[p.id] === 1 ? 'entry' : 'entries'}
                </span>
              )}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p id="program-count" className="program-count">
          {records.filter((r) => r.program === program).length} entries in this
          program
        </p>
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
              className="primary-button"
              href="#search"
              onClick={() => {
                setQuery(null);
                setEntered(true);
              }}
            >
              Enter FP AIMS <ArrowRight size={22} />
            </a>
            <span className="welcome-steps">
              Select a program. Search. Discover.
            </span>
          </section>
          <p className="welcome-footer">Materials. Services. Confidence.<a href="#eplan" className="database-link">ePlan budgets</a></p>
        </div>
      </main>
    );
  return (
    <div
      ref={appRef}
      className={`app ${query === null ? 'search-view' : 'results-view'} ${noResults ? 'no-results-view' : ''}`}
    >
      <header ref={headerRef} className="app-header">
        <div className="header-inner">
          <a
            href="#"
            className="brand-link"
            aria-label="FP AIMS home"
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
        <div className="page-title">
          <a className="back-link" href="#" onClick={() => setEntered(false)}>
            <ArrowLeft size={16} /> Home
          </a>
          <h1>
            Find what you need<span>.</span>
          </h1>
          <p>Materials and services, organized by program.</p>
        </div>
        <div className="workspace-grid">
          {!noResults && <aside className="search-panel">{searchForm}</aside>}
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
            {query === null ? null : (
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
                <div className="results-heading">
                  <span className="eyebrow">
                    {query ? 'SEARCH RESULTS' : 'PROGRAM DIRECTORY'}
                  </span>
                  <h2>{query ? <>Results for “{query}”</> : current.name}</h2>
                </div>
                <div
                  className={`result-status ${own.length ? 'found' : 'not-found'}`}
                >
                  {own.length ? <Check size={21} /> : <Minus size={21} />}
                  <div>
                    <h3>
                      {own.length
                        ? `${groups.length} ${groups.length === 1 ? 'match' : 'matches'} in ${current.name}`
                        : `Not found in ${current.name}`}
                    </h3>
                    <p>
                      {own.length
                        ? 'Listed in the program’s budget narratives.'
                        : noResults
                          ? 'No matches across all five programs.'
                          : 'No matching entry in this program’s current list.'}
                    </p>
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
                          <article key={p.id} className="alternative-card">
                            <span className="available">
                              <Check size={13} /> Listed in this program
                            </span>
                            <h3>{p.name}</h3>
                            <p>
                              {grouped.length}{' '}
                              {grouped.length === 1 ? 'match' : 'matches'}
                            </p>
                            <ul>
                              {grouped
                                .slice(0, 2)
                                .map((g: { key: string; item: Item }) => (
                                  <li key={g.key}>{g.item.item}</li>
                                ))}
                            </ul>
                            <button
                              onClick={() => {
                                changeProgram(p.id);
                                resultsRef.current?.scrollIntoView({
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
                {noResults && (
                  <div className="retry-search search-panel">{searchForm}</div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Check,
  Minus,
  BookOpen,
  ChevronDown,
  X,
  ExternalLink,
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { programs, searchRecords, groupMatches } from '@/lib/search.mjs';
import records from '@/data/records.json';
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
function SourceNote() {
  return (
    <p className="source-note">
      FY 2027 · ePlan budget narratives · Revision 1<br />A public-information
      reference. Matches reflect listed items and recipients, not a blanket
      purchasing approval.
    </p>
  );
}
function MatchCard({
  item,
  recipients,
  count,
}: {
  item: Item;
  recipients: string[];
  count: number;
}) {
  return (
    <article className="match-card">
      <div className="item-icon">
        <BookOpen size={21} />
      </div>
      <div className="match-content">
        <span className="eyebrow">{item.subcategory}</span>
        <h3>{item.item}</h3>
        <p className="account">
          {item.account} · {item.category}
        </p>
        <details>
          <summary>
            Source details <ChevronDown size={16} />
          </summary>
          <div className="details-content">
            <p>
              <strong>Line item:</strong> {item.line}
            </p>
            <p>
              <strong>Recipient / set-aside:</strong> {recipients.join('; ')}
            </p>
            <p>
              {count} source {count === 1 ? 'entry' : 'entries'} · FY 2027 ·
              Revision 1
            </p>
          </div>
        </details>
      </div>
    </article>
  );
}
export default function Home() {
  const [entered, setEntered] = useState(() => location.hash === '#search');
  const [program, setProgram] = useState('title-1-a');
  const [word, setWord] = useState('');
  const [query, setQuery] = useState<string | null>(null);
  const [visible, setVisible] = useState(30);
  const resultsRef = useRef<HTMLDivElement>(null),
    inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const sync = () => setEntered(location.hash === '#search');
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const current = programs.find((p) => p.id === program)!;
  const matching = query === null ? [] : searchRecords(records, query);
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
              onClick={() => setEntered(true)}
            >
              Enter FP AIMS <ArrowRight size={22} />
            </a>
            <span className="welcome-steps">
              Select a program. Search. Discover.
            </span>
          </section>
          <p className="welcome-footer">Materials. Services. Confidence.</p>
          <SourceNote />
        </div>
      </main>
    );
  return (
    <div className="app">
      <header className="app-header">
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
            PUBLIC RESOURCE DIRECTORY<span>FY 2027 · Revision 1</span>
          </span>
        </div>
      </header>
      <main className="workspace">
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
          <aside className="search-panel">
            <form onSubmit={submit}>
              <fieldset>
                <legend>
                  <span className="step-number">1</span> Select a program
                </legend>
                <RadioGroup
                  value={program}
                  onValueChange={(value) => changeProgram(String(value))}
                  aria-label="Select a program"
                  className="program-list"
                >
                  {programs.map((p) => (
                    <label
                      className={`program-option ${program === p.id ? 'selected' : ''}`}
                      key={p.id}
                    >
                      <RadioGroupItem value={p.id} id={p.id} />
                      <span>
                        {p.name}
                        <small>
                          {records.filter((r) => r.program === p.id).length}{' '}
                          entries
                        </small>
                      </span>
                      {program === p.id && (
                        <Check size={17} className="selected-check" />
                      )}
                    </label>
                  ))}
                </RadioGroup>
              </fieldset>
              <div className="search-field">
                <label htmlFor="search">
                  <span className="step-number">2</span> Search items or
                  services
                </label>
                <div className="input-wrap">
                  <Search size={21} />
                  <input
                    id="search"
                    ref={inputRef}
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    placeholder="Try books, paint, training…"
                    type="search"
                    autoComplete="off"
                    maxLength={150}
                  />
                  {word && (
                    <button
                      type="button"
                      className="clear-button"
                      aria-label="Clear search"
                      onClick={() => {
                        setWord('');
                        inputRef.current?.focus();
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
              <button
                className="browse-button"
                type="button"
                onClick={() => {
                  setWord('');
                  setQuery('');
                  setVisible(30);
                }}
              >
                Browse all items in this program
              </button>
            </form>
            <div className="search-tip">
              <Search size={19} />
              <p>One search checks all five programs.</p>
            </div>
          </aside>
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
            {query === null ? (
              <div className="ready-state">
                <div className="ready-icon">
                  <Search size={34} strokeWidth={1.6} />
                </div>
                <span className="eyebrow">THE RIGHT RESOURCE STARTS HERE</span>
                <h2>What are you looking for?</h2>
                <p>
                  Choose a program and search for a material, item, or service.
                  You’ll also see where it’s listed in other programs.
                </p>
                <div className="suggestions">
                  {['Books', 'Art supplies', 'Professional development'].map(
                    (text) => (
                      <button
                        key={text}
                        onClick={() => {
                          setWord(text);
                          setQuery(text);
                          setVisible(30);
                        }}
                      >
                        {text}
                        <ArrowRight size={15} />
                      </button>
                    ),
                  )}
                </div>
                <div className="directory-stats">
                  <span>
                    <strong>1,009</strong> source entries
                  </span>
                  <span>
                    <strong>5</strong> programs
                  </span>
                </div>
              </div>
            ) : (
              <>
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
                        recipients: string[];
                        count: number;
                      }) => (
                        <MatchCard
                          key={g.key}
                          item={g.item}
                          recipients={g.recipients}
                          count={g.count}
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
                {!matching.length && (
                  <div className="empty-state">
                    <h3>No matches across the five programs.</h3>
                    <p>
                      Try a shorter word, a different spelling, or a broader
                      term such as “books” or “training”.
                    </p>
                    <button
                      className="browse-button"
                      onClick={() => {
                        setWord('');
                        setQuery('');
                      }}
                    >
                      Browse {current.name}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
        <footer className="app-footer">
          <SourceNote />
          <a href="https://eplan.tn.gov/" target="_blank" rel="noreferrer">
            View ePlan source <ExternalLink size={14} />
          </a>
        </footer>
      </main>
    </div>
  );
}

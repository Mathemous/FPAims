# Current update status

The app now has a separate #eplan view of the saved source budgets, grouped by program, account, and object line, including full narratives and recipient metadata. This is a snapshot, not a live connection.

Automatic item replacement is blocked. The importer raises an error before writing app data when changed groups require item review. The app no longer links users to the old publishing workflow. No individual-item extractor or approval interface is implemented yet.

Next: extract structured item proposals with source IDs, exact supporting text, recipients and restrictions; compare them against the original workbook; review additions, edits and removals; only then publish reviewed item records. Full narratives belong in the source archive and must never substitute for individual item names.

## Legacy implementation notes (publishing instructions below are superseded)

# Updating from Knox County Schools ePlan

Open **View database → Update from ePlan → Check ePlan on GitHub**. Sign in with repository write access. Run **Update Knox County ePlan** on `main`, selecting the fiscal year (initially 2027). The updater chooses that year's highest approved Consolidated revision and downloads the five program budgets through ePlan's public interface. It never signs in to or writes to ePlan.

Open the completed run's summary. If the source changed, use its review link and merge the proposed update after reviewing it. If repository settings prevent Actions from creating a pull request, the summary links to the saved branch's comparison page, where you can create the pull request yourself. GitHub permissions protect publishing; no credential is included in the browser. A merge into main deploys through the existing Vercel integration. No schedule is enabled.

## Data rules

`data/eplan-source.json` preserves all original exported budget rows, including personnel. `data/eplan-meta.json` records the fiscal year, revision, source-check date and published entry counts. `data/eplan-update.json` describes the latest published comparison.

The initial FY2027 revision 1 baseline retains the 1,009 curated workbook entries. This establishes a comparison point; it does not claim every manually transcribed item was independently audited. On later refreshes, program/account/line groups with unchanged descriptions and recipient context retain their existing item names. Changes to export keys, amounts or timestamps alone do not replace curated names. A changed or new group receives complete source narratives; a deleted group loses its stale entries. A new fiscal year replaces all groups. Narratives, program codes, budget tags and organization details remain available in search and source details. Counts are entries, not individual materials.

The materials/services index includes object lines 300–899, excluding account 99100 transfers. Personnel/benefits and indirect transfers remain in the source archive. The importer does not infer individual school recipients from mixed narrative text or imply that a listed purchase authorizes a different program's use.

Downloads must include all five programs, the exact district and approved status, expected export columns, valid account/line/source keys, and unique records. An invalid or partial download fails before modifying app data. Older years/revisions, blank replacement narratives, duplicate IDs and an empty result are rejected. Every proposed update runs the importer tests, app tests and production build. Previous data remains in Git history.

## Local maintenance

Install the isolated importer dependencies with `npm ci --prefix scripts/eplan`, then run `npx playwright install chromium` from that directory. From the repository root:

```sh
node scripts/eplan/fetch-eplan.mjs /tmp/eplan 2027
python scripts/eplan/import_eplan.py /tmp/eplan .
python -m unittest discover -s scripts/eplan -p 'test_*.py'
npm test
npm run build
```

On a Windows machine with Edge installed, set `EPLAN_BROWSER_CHANNEL=msedge` to use it. The parser uses Python's standard-library ZIP/XML reader because ePlan exports contain styles that some Excel libraries reject. The workflow uses a clean download directory for each run and a 15-minute timeout. If ePlan changes its layout, the job fails and the selectors/validation must be updated; it does not silently publish partial data.

References: [ePlan](https://eplan.tn.gov/), [GitHub workflow permissions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository), [Playwright CI setup](https://playwright.dev/docs/ci).

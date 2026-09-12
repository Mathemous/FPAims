# FP AIMS

Federal Programs Approved Items, Materials & Services. A free, public, mobile-friendly reference directory built with React and Vite. No login, server, database, paid API, or environment variables are required.

## Use

Enter from the welcome page, choose one of five programs, and search an item or service. Results automatically include matches in other programs. Expand Source details for account, line item and recipient context. Empty searches browse the selected program; long results load in batches of 30.

## Data

`data/records.json` contains 1,009 entries transcribed from the user's FY 2027 ePlan budget-narrative workbook, Revision 1:

| Program | Entries |
| --- | ---: |
| Title I, Part A | 463 |
| Title I, Part A–Neglected | 53 |
| Title I, Part D | 18 |
| Title II, Part A | 283 |
| Title IV | 192 |

Personnel and indirect cost entries are excluded. Entries retain account, category, narrative subcategory, item/service, line item number, and recipient. Grouped search results preserve all recipients. A match represents an entry in the source narrative, not a general determination of allowable spending. No-match means not found in this list, not legally prohibited.

Some narratives in the source FY 2027 application retain FY 2026 wording; refer to the original ePlan application for full context. This is an independent public-information reference, not an official ePlan service. Branding background was requested by the creator. The KCS image source is the district's profile image at https://x.com/KnoxSchools (https://pbs.twimg.com/profile_images/1401988467496783875/5KpKm-dD_400x400.jpg).

The CPR training mockup used illustrative data. The actual app accurately finds CPR training only in Title IV, for Grace Christian Academy.

## Development

Use Node.js 22.13 or newer.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

## Vercel

Import this GitHub repository into Vercel. `vercel.json` selects Vite, `npm run build`, and the static `dist` directory. There are no runtime functions or paid database dependencies. Updates pushed to the production branch are automatically deployed by the GitHub integration. Hosting remains subject to Vercel's current Hobby-plan eligibility and limits.

## Updating the list

Edit `data/records.json` while preserving its fields. Each entry has a unique `id` and one of the program identifiers in `lib/search.mjs`. Validate counts and update the count assertions in `tests/search.test.mjs` when the source list changes. Run tests and the build, then push to GitHub. Program entry counts in the UI are calculated from the data.

Welcome and search screens use a URL hash so they work on ordinary static hosting. The app includes a home-screen web manifest; it does not cache offline data or store visitors' searches.

## Windows launchers

Double-click the batch files in the parent FP-Aims folder. All application files, dependencies, scripts, and Git history live in FP_Aims underneath it. Backups remain in the parent Backups folder. The launchers use relative paths, so this entire parent folder can be moved together.

- **Push.bat**: tests and builds, commits local changes if needed, then pushes main. Vercel publishes new app changes automatically. Stops if a step fails; never force-pushes.
- **Git Pull.bat**: requires a clean working tree, pulls fast-forward only, then installs locked dependencies.
- **Create Backup.bat**: creates `Backups/FP-AIMS_timestamp`, verifies source files with SHA256, and includes a verified Git-history bundle. Only completed backups get a completion marker. Dependencies, builds, caches and earlier backups are excluded. Backups stay out of GitHub.
- **Restore Latest Backup.bat**: verifies the newest completed backup, requests RESTORE confirmation and creates a safety backup before replacing source files. Preserves Git metadata and local environment files. Newer extra files are not deleted. Reinstalls dependencies and checks the build. Does not automatically push. Add `-DryRun` to verify without restoring.
- **1 - Start Vite.bat**: opens the local app on port 5180. Keep the window open; Ctrl+C stops it. An occupied port causes an error instead of opening another project's app.
- **Check Build.bat**: runs tests and the production build without publishing.
- **Tree Generator.bat**: generates `Tree.md`, excluding dependencies, history and backup folders.
- **Open Live App.bat**: opens the public Vercel app.

For unattended use, add `-NoPause` to any launcher. The shared implementation lives in `FP_Aims/scripts/project-tools.ps1`. Backups include both app source and the parent launchers. Existing flat backups restore launcher files to the parent and app files to the child. Restoring uses a file overlay, not a destructive directory mirror; Git history is available in each backup's `history.bundle` for advanced recovery.


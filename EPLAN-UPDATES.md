# Updating from Knox County Schools ePlan

The downloader selects the requested fiscal year's highest approved Consolidated revision and retrieves all five program budgets through ePlan's public interface. It records the application name, application date, revision, approval status, source-check time, and every exported budget row.

The full source is published separately in the app's ePlan budget view. That view shows direct export fields and full narratives. It includes personnel and other rows outside the materials-and-services search.

## Individual-item database

The searchable database contains individual items and services. A full narrative must never replace an item list.

Automatic publication is blocked when a source narrative changes. A future extractor must produce proposed individual items with:

- the exact source row ID;
- the exact supporting narrative text;
- the program, account, category, and line item exported by ePlan; and
- no inferred recipient, school, set-aside, or applicability field.

Unclear text must be omitted from the proposed database and reported for review. The extractor must be tested against the FY2027 baseline before it can publish changes.

## Validation

Downloads must include all five programs, Knox County Schools district code 470, an approved application, expected export columns, valid source keys, and unique records. Older years or revisions, incomplete downloads, duplicate IDs, blank changed narratives, and empty results are rejected.

The materials-and-services index includes object lines 300–899 and excludes account 99100 transfers. Personnel, benefits, and indirect transfers remain available in the full ePlan source view.

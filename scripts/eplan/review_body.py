import json
from pathlib import Path
import sys

report = json.loads(Path(sys.argv[1]).read_text())
text = f"""Refresh the shared FP AIMS database from Knox County Schools' approved FY {report['year']} Consolidated application, revision {report['revision']}.

The importer downloaded and validated all five public program budgets. It retained {report['retainedEntries']} existing entries, removed {report['removedEntries']} entries from changed or deleted budget groups, and added {report['addedNarratives']} complete source narratives. The proposed database has {report['entries']} entries.

Review `data/eplan-update.json` for changed program/account/line groups, `data/eplan-source.json` for the original budget descriptions, and `data/records.json` for search results. Narratives can mention multiple schools and list several materials; the importer preserves that text without assigning every material to every school.

Validation: importer unit tests, application search tests, and production build passed. Merging updates the shared app through its existing Vercel deployment.
"""
Path(sys.argv[2]).write_text(text, encoding='utf-8')

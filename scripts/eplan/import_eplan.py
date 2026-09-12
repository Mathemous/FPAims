"""Validate public ePlan exports and prepare an atomic, reviewable database update.

Uses the standard library because ePlan's generated XLSX styles are not valid in
some spreadsheet libraries. Only the named Budget Data worksheet is read.
"""
import argparse
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import posixpath
import re
import xml.etree.ElementTree as ET
import zipfile

PROGRAMS = {'title-1-a', 'title-1-neglected', 'title-1-d', 'title-2-a', 'title-4'}
NS = {'x': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
FIELDS = {'Item Key': 'sourceId', 'Account Number': 'account',
          'Account Number Description': 'category', 'Line Item Number': 'line',
          'Line Item Number Description': 'subcategory', 'Budget Tags': 'tags',
          'Optional Program Code': 'programCode', 'Organization Code': 'organizationCode',
          'Organization': 'organization', 'Narrative Description': 'narrative',
          'Total': 'total', 'Last Updated Date': 'updatedAt'}

def clean(value):
    return re.sub(r'\n{3,}', '\n\n', str(value).replace('\r', '')).strip()

def read_budget(path, program):
    with zipfile.ZipFile(path) as archive:
        if sum(info.file_size for info in archive.infolist()) > 50_000_000:
            raise ValueError('Budget workbook is too large.')
        workbook = ET.fromstring(archive.read('xl/workbook.xml'))
        sheet = next((s for s in workbook.findall('x:sheets/x:sheet', NS) if s.get('name') == 'Budget Data'), None)
        if sheet is None:
            raise ValueError('Budget Data worksheet is missing.')
        rel_id = sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        rels = ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
        target = next(r.get('Target') for r in rels if r.get('Id') == rel_id)
        name = posixpath.normpath(posixpath.join('xl', target)) if not target.startswith('/') else target.lstrip('/')
        shared = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            shared = [''.join(s.itertext()) for s in ET.fromstring(archive.read('xl/sharedStrings.xml'))]
        rows = []
        for row in ET.fromstring(archive.read(name)).findall('x:sheetData/x:row', NS):
            cells = {}
            for cell in row.findall('x:c', NS):
                value = cell.find('x:v', NS)
                text = value.text or '' if value is not None else ''.join(cell.find('x:is', NS).itertext()) if cell.find('x:is', NS) is not None else ''
                if cell.get('t') == 's':
                    text = shared[int(text)]
                cells[re.sub(r'\d', '', cell.get('r'))] = clean(text)
            rows.append(cells)
    if len(rows) < 2:
        raise ValueError(f'{program}: empty budget export.')
    headers = rows[0]
    if not set(FIELDS).issubset(headers.values()):
        raise ValueError(f'{program}: unexpected columns in ePlan export.')
    result = []
    for row in rows[1:]:
        if not any(row.values()):
            continue
        record = {FIELDS[heading]: row.get(col, '') for col, heading in headers.items() if heading in FIELDS}
        record['program'] = program
        if not record['sourceId'].isdigit() or not re.fullmatch(r'\d{5}', record['account']) or not re.fullmatch(r'\d{3}', record['line']):
            raise ValueError(f'{program}: invalid source key/account/line.')
        if not record['category'] or not record['subcategory'] or not record['organization']:
            raise ValueError(f'{program}: missing source context.')
        float(record['total'])
        result.append(record)
    if len({r['sourceId'] for r in result}) != len(result):
        raise ValueError(f'{program}: duplicate source keys.')
    return result

def group_key(record):
    return '|'.join(record[key] for key in ('program', 'account', 'line'))

def eligible(record):
    # Keep the app's materials/services scope; retain ALL rows in the source archive.
    return 300 <= int(record['line']) < 900 and record['account'] != '99100'

def group_fingerprints(rows):
    grouped = defaultdict(list)
    for row in rows:
        if eligible(row):
            # Keys, amounts and timestamps can change without changing listed materials.
            grouped[group_key(row)].append({k: row[k] for k in ('category', 'subcategory', 'narrative', 'organization', 'organizationCode', 'programCode', 'tags')})
    return {key: sorted(json.dumps(r, sort_keys=True) for r in group) for key, group in grouped.items()}

def reconcile(records, previous, incoming):
    if incoming['year'] < previous['year'] or (incoming['year'] == previous['year'] and incoming['revision'] < previous['revision']):
        raise ValueError('Refusing to replace the database with an older year or revision.')
    old, new = group_fingerprints(previous['rows']), group_fingerprints(incoming['rows'])
    keys = set(old) | set(new) | {group_key(r) for r in records}
    changed = {key for key in keys if old.get(key) != new.get(key)}
    if incoming['year'] != previous['year']:
        changed = keys
    result = [r for r in records if group_key(r) not in changed]
    replacements = []
    for row in incoming['rows']:
        if group_key(row) not in changed or not eligible(row):
            continue
        if not row['narrative']:
            raise ValueError(f"Changed budget entry {row['sourceId']} has no narrative; manual review is needed.")
        replacements.append({
            'id': f"eplan-{incoming['year']}-{row['program']}-{row['sourceId']}",
            'program': row['program'], 'account': row['account'], 'category': row['category'],
            'subcategory': row['subcategory'], 'item': row['subcategory'], 'line': row['line'],
            'recipient': ' · '.join(v for v in [row['organization'], row['programCode'], row['tags']] if v),
            'narrative': row['narrative'], 'sourceId': row['sourceId'],
        })
    result.extend(replacements)
    if not result or len({r['id'] for r in result}) != len(result):
        raise ValueError('Update would create an empty database or duplicate records.')
    return result, {'changedGroups': sorted(changed), 'retainedEntries': len(result) - len(replacements),
                    'removedEntries': len(records) - (len(result) - len(replacements)), 'addedNarratives': len(replacements)}

def prepare(download_dir):
    manifest = json.loads((download_dir / 'manifest.json').read_text(encoding='utf-8-sig'))
    if manifest.get('districtCode') != '470' or manifest.get('district') != 'Knox County Schools' or manifest.get('status') != 'TDOE FPO Director Approved':
        raise ValueError('Unexpected district or unapproved application.')
    if {p['id'] for p in manifest['programs']} != PROGRAMS or len(manifest['programs']) != 5:
        raise ValueError('All five programs must be downloaded together.')
    rows = []
    for program in manifest['programs']:
        rows.extend(read_budget(download_dir / f"{program['id']}.xlsx", program['id']))
    manifest['rows'] = rows
    manifest['fingerprint'] = hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest()
    return manifest

def require_item_review(report):
    if report['changedGroups']:
        raise ValueError('Item-level review required. Source narratives cannot replace individual item lists. No app data was updated.')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('download_dir', type=Path)
    parser.add_argument('repository', type=Path)
    parser.add_argument('--baseline', action='store_true', help='Establish source comparison without changing the original curated records.')
    args = parser.parse_args()
    incoming = prepare(args.download_dir)
    data = args.repository / 'data'
    source_path = data / 'eplan-source.json'
    records = json.loads((data / 'records.json').read_text(encoding='utf-8-sig'))
    if args.baseline:
        if source_path.exists():
            raise ValueError('A baseline already exists.')
        updated = records
        report = {'changedGroups': [], 'retainedEntries': len(records), 'removedEntries': 0, 'addedNarratives': 0}
    else:
        previous = json.loads(source_path.read_text(encoding='utf-8'))
        updated, report = reconcile(records, previous, incoming)
        require_item_review(report)
    report.update({'checkedAt': incoming['checkedAt'], 'year': incoming['year'], 'revision': incoming['revision'], 'sourceRows': len(incoming['rows']), 'entries': len(updated)})
    (args.download_dir / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    if not args.baseline and all(previous.get(k) == incoming.get(k) for k in ('fingerprint', 'year', 'revision', 'status')):
        print('No source changes. Published database is unchanged.')
        print(json.dumps(report, indent=2))
        return
    # Validation completes before any app data is touched. CI publishes all files together.
    meta = {k: v for k, v in incoming.items() if k != 'rows'}
    meta['sourceRows'] = len(incoming['rows'])
    meta['recordCounts'] = {p: sum(r['program'] == p for r in updated) for p in sorted(PROGRAMS)}
    for filename, value in [('eplan-source.json', incoming), ('eplan-meta.json', meta), ('eplan-update.json', report)]:
        (data / filename).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if updated != records:
        (data / 'records.json').write_text(json.dumps(updated, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()

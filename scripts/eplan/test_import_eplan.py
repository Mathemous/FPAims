import unittest
from import_eplan import reconcile, require_item_review

def row(**changes):
    return dict({'program': 'title-4', 'account': '71100', 'line': '429',
                 'category': 'Regular Instruction', 'subcategory': 'Supplies',
                 'sourceId': '123', 'organization': 'Knox County Schools', 'organizationCode': '470',
                 'programCode': 'NPS', 'tags': '', 'narrative': 'School A: paint, pens.',
                 'total': '500', 'updatedAt': 'today'}, **changes)

def source(rows=None, **changes):
    return dict({'year': 2027, 'revision': 1, 'rows': rows or [row()]}, **changes)

class ImportTests(unittest.TestCase):
    def test_publish_guard_rejects_changed_item_groups(self):
        with self.assertRaisesRegex(ValueError, 'Item-level review required'):
            require_item_review({'changedGroups': ['title-4|71100|429']})

    def test_publish_guard_allows_unchanged_item_groups(self):
        require_item_review({'changedGroups': []})

    def setUp(self):
        self.records = [{'id': 'original-1', 'program': 'title-4', 'account': '71100', 'line': '429',
                         'category': 'Regular Instruction', 'subcategory': 'Art', 'item': 'Paint', 'recipient': 'School A'}]

    def test_unchanged_preserves_curated_items_even_when_keys_or_amounts_change(self):
        result, report = reconcile(self.records, source(), source([row(sourceId='999', total='700', updatedAt='tomorrow')], revision=2))
        self.assertEqual(result, self.records)
        self.assertEqual(report['changedGroups'], [])

    def test_changed_narrative_replaces_only_affected_group_with_complete_source(self):
        other = dict(self.records[0], id='other', program='title-1-a')
        updated_row = row(narrative='School A: brushes.\n\nSchool B: books.')
        result, report = reconcile(self.records + [other], source(), source([updated_row], revision=2))
        self.assertIn(other, result)
        self.assertNotIn(self.records[0], result)
        self.assertEqual(result[-1]['narrative'], updated_row['narrative'])
        self.assertEqual(report['removedEntries'], 1)

    def test_deletions_remove_old_entries_and_new_groups_are_added(self):
        result, _ = reconcile(self.records, source(), source([row(account='72210')], revision=2))
        self.assertEqual([r['account'] for r in result], ['72210'])

    def test_new_year_replaces_curated_rows_even_with_identical_narratives(self):
        result, _ = reconcile(self.records, source(), source(year=2028, revision=0))
        self.assertEqual(result[0]['sourceId'], '123')

    def test_rollback_and_blank_changed_narrative_are_rejected(self):
        for incoming in [source(year=2026), source(revision=0), source([row(narrative='')], revision=2)]:
            with self.assertRaises(ValueError):
                reconcile(self.records, source(), incoming)

    def test_distinct_recipient_narratives_remain_separate(self):
        result, _ = reconcile(self.records, source(), source([row(narrative='School A: books'), row(sourceId='124', narrative='School B: pens')], revision=2))
        self.assertEqual(len(result), 2)
        self.assertEqual(len({r['id'] for r in result}), 2)

    def test_personnel_and_indirect_costs_do_not_enter_materials_search(self):
        result, _ = reconcile(self.records, source(), source([row(), row(line='116', sourceId='2'), row(account='99100', line='599', sourceId='3')], revision=2))
        self.assertEqual(result, self.records)

if __name__ == '__main__':
    unittest.main()

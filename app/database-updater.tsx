import { RefreshCw } from 'lucide-react';
import source from '@/data/eplan-meta.json';



export default function DatabaseUpdater() {
  return (
    <details className="database-updater">
      <summary><span><RefreshCw size={18} /> Item update status</span><span className="updater-edition">FY {source.year} · Revision {source.revision}</span></summary>
      <div className="updater-body">
        <h2>Preserve the individual item database</h2>
        <p>Source downloads and item extraction are separate steps. Item extraction and approval are not available in the app yet.</p>
        <p className="updater-stamp">Published source checked {new Date(source.checkedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} · {source.sourceRows} budget rows verified.</p>
        <p>Automatic item updates are paused. Changed narratives must first be converted into individual items with exact source references. Ambiguous text must be omitted and reported rather than converted into an inferred field. The importer blocks updates that would replace item lists with narratives.</p>
        <a href="#eplan">Browse full ePlan budgets and narratives</a>
      </div>
    </details>
  );
}

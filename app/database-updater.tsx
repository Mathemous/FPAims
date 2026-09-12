import { RefreshCw } from 'lucide-react';
import source from '@/data/eplan-meta.json';



export default function DatabaseUpdater() {
  return (
    <details className="database-updater">
      <summary><span><RefreshCw size={18} /> Item update status</span><span className="updater-edition">FY {source.year} · Revision {source.revision}</span></summary>
      <div className="updater-body">
        <h2>Preserve the individual item database</h2>
        <p>Source downloads are maintained in the separate updater project. Item extraction is not performed by this app.</p>
        <p className="updater-stamp">Published source checked {new Date(source.checkedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} · {source.sourceRows} budget rows verified.</p>
        <p>Narrative refreshes update the full ePlan budget view without changing the individual-item database. Any future item changes must use exact source references, and ambiguous text must be omitted rather than inferred.</p>
        <a href="#eplan">Browse full ePlan budgets and narratives</a>
      </div>
    </details>
  );
}

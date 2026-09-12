import { ExternalLink, RefreshCw } from 'lucide-react';
import source from '@/data/eplan-meta.json';

const workflow = 'https://github.com/Mathemous/FPAims/actions/workflows/update-eplan.yml';

export default function DatabaseUpdater() {
  return (
    <details className="database-updater">
      <summary><span><RefreshCw size={18} /> Update from ePlan</span><span className="updater-edition">FY {source.year} · Revision {source.revision}</span></summary>
      <div className="updater-body">
        <h2>Refresh Knox County Schools data</h2>
        <p>Checks the latest approved Consolidated application for the fiscal year you choose, across all five programs.</p>
        <p className="updater-stamp">Published source checked {new Date(source.checkedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} · {source.sourceRows} budget rows verified.</p>
        <ol>
          <li><strong>Check ePlan.</strong> Open the update job below, sign in to GitHub with repository access, and choose <strong>Run workflow</strong>. Use branch <strong>main</strong> and the fiscal year you want.</li>
          <li><strong>Review changes.</strong> Open the completed run’s summary. It reports changed budget sections and links to a proposed update when the source has changed.</li>
          <li><strong>Publish.</strong> Review and merge the proposed update on GitHub. The shared app updates after deployment.</li>
        </ol>
        <div className="updater-actions">
          <a href={workflow} target="_blank" rel="noopener noreferrer" className="primary-button">Check ePlan on GitHub <ExternalLink size={16} /></a>
          <a href="https://eplan.tn.gov/" target="_blank" rel="noopener noreferrer">Open public ePlan <ExternalLink size={14} /></a>
        </div>
        <p className="updater-note">Unchanged entries keep their existing item names. Changed budget sections use complete ePlan narratives, including school and set-aside details. Entry counts can change because one narrative may list several items. An incomplete download stops the update.</p>
      </div>
    </details>
  );
}

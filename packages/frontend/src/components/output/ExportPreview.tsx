'use client';

import { useDesignStore } from '@/store/design.store';

export function ExportPreview() {
  const exportBundle = useDesignStore((s) => s.exportBundle);
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const generateExport = useDesignStore((s) => s.generateExport);
  const isLoading = useDesignStore((s) => s.isLoading);

  const bundle = exportBundle || activeDesign?.export_bundle;

  const handleDownload = () => {
    if (!bundle) return;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDesign?.name || 'design'}-export-bundle.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!bundle) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-studio-text-muted uppercase">Export Preview</h3>
        <div className="flex gap-2">
          <button
            onClick={generateExport}
            disabled={isLoading || !activeDesign?.graph}
            className="rounded bg-studio-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-studio-accent-hover disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Generating...' : 'Generate Bundle'}
          </button>
        </div>
        <p className="text-xs text-studio-text-muted">
          Finalize your design to preview the export bundle and publish to a target.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-studio-text-muted uppercase">Export Preview</h3>
        <button
          onClick={handleDownload}
          className="rounded border border-studio-accent px-2 py-1 text-[10px] font-medium text-studio-accent hover:bg-studio-accent hover:text-white transition-colors"
        >
          Download JSON
        </button>
      </div>

      {/* Design Summary */}
      {bundle.design_summary_md && (
        <div className="rounded border border-studio-border p-2">
          <span className="text-[10px] font-semibold text-studio-text-muted uppercase">Summary</span>
          <div className="mt-1 text-xs text-studio-text whitespace-pre-wrap">
            {bundle.design_summary_md}
          </div>
        </div>
      )}

      {/* Counts */}
      <div className="flex flex-wrap gap-2">
        <div className="rounded border border-studio-border px-2 py-1">
          <span className="text-[10px] text-studio-text-muted">Agents: </span>
          <span className="text-xs font-semibold text-indigo-400">
            {bundle.agent_definitions.length}
          </span>
        </div>
        <div className="rounded border border-studio-border px-2 py-1">
          <span className="text-[10px] text-studio-text-muted">Skills: </span>
          <span className="text-xs font-semibold text-emerald-400">
            {bundle.skill_definitions.length}
          </span>
        </div>
        <div className="rounded border border-studio-border px-2 py-1">
          <span className="text-[10px] text-studio-text-muted">Heartbeats: </span>
          <span className="text-xs font-semibold text-pink-400">
            {bundle.heartbeat_definitions.length}
          </span>
        </div>
        <div className="rounded border border-studio-border px-2 py-1">
          <span className="text-[10px] text-studio-text-muted">Nodes: </span>
          <span className="text-xs font-semibold text-studio-text">
            {bundle.graph.nodes.length}
          </span>
        </div>
      </div>

      {/* Validation Status */}
      <div className="rounded border border-studio-border p-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              bundle.validation_report.valid ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-[10px] font-semibold text-studio-text-muted uppercase">
            Validation: {bundle.validation_report.valid ? 'Passed' : 'Failed'}
          </span>
        </div>
        {bundle.validation_report.errors.length > 0 && (
          <span className="text-[10px] text-red-400 mt-0.5 block">
            {bundle.validation_report.errors.length} error(s)
          </span>
        )}
      </div>

      {/* Deployment Recommendation */}
      {bundle.deployment_recommendation && (
        <div className="rounded border border-studio-border p-2">
          <span className="text-[10px] font-semibold text-studio-text-muted uppercase">
            Deployment Notes
          </span>
          {bundle.deployment_recommendation.notes.map((note, i) => (
            <p key={i} className="text-[10px] text-studio-text-muted mt-0.5">
              {note}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

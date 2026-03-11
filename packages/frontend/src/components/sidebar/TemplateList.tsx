'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useDesignStore } from '@/store/design.store';
import type { StudioTemplate, StudioGraph } from '@openclaw-studio/shared';

export function TemplateList() {
  const [templates, setTemplates] = useState<StudioTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const createDesign = useDesignStore((s) => s.createDesign);
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const updateGraph = useDesignStore((s) => s.updateGraph);

  useEffect(() => {
    setIsLoading(true);
    api
      .get<StudioTemplate[]>('/templates')
      .then(setTemplates)
      .catch(() => {
        // API might not be available, use placeholder templates
        setTemplates([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleUseTemplate = async (template: StudioTemplate) => {
    const graph = template.template_json as unknown as StudioGraph;
    if (!activeDesign) {
      await createDesign(template.name, `Based on template: ${template.name}`);
    }
    if (graph && graph.nodes) {
      updateGraph(graph);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-studio-text-muted uppercase">Templates</span>
      </div>

      {isLoading && <p className="text-xs text-studio-text-muted">Loading templates...</p>}

      {!isLoading && templates.length === 0 && (
        <p className="text-xs text-studio-text-muted">
          No templates available. Templates will appear once created in the system.
        </p>
      )}

      <ul className="space-y-1">
        {templates.map((template) => (
          <li
            key={template.id}
            className="rounded border border-studio-border px-2 py-1.5 text-xs hover:border-studio-accent transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-studio-text truncate">{template.name}</div>
                <div className="text-studio-text-muted truncate">{template.description}</div>
                <span className="text-[9px] text-studio-accent">{template.template_type}</span>
              </div>
              <button
                onClick={() => handleUseTemplate(template)}
                className="text-[9px] text-studio-accent hover:text-studio-accent-hover whitespace-nowrap ml-2 border border-studio-accent/30 rounded px-1.5 py-0.5"
              >
                Use
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

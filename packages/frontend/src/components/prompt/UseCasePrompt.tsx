'use client';

import { useState } from 'react';
import { ExportDialog } from '@/components/export/ExportDialog';
import { useDesignStore } from '@/store/design.store';
import { useToast } from '@/components/common/Toast';
import { api } from '@/lib/api';

interface UseCasePromptProps {
  onToggleChat?: () => void;
  isChatOpen?: boolean;
}

export function UseCasePrompt({ onToggleChat, isChatOpen }: UseCasePromptProps = {}) {
  const [prompt, setPrompt] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSavingVersion, setIsSavingVersion] = useState(false);

  const activeDesign = useDesignStore((s) => s.activeDesign);
  const isGenerating = useDesignStore((s) => s.isGenerating);
  const isLoading = useDesignStore((s) => s.isLoading);
  const error = useDesignStore((s) => s.error);
  const plannerOutput = useDesignStore((s) => s.plannerOutput);
  const generatePlan = useDesignStore((s) => s.generatePlan);
  const refinePlan = useDesignStore((s) => s.refinePlan);
  const validateDesign = useDesignStore((s) => s.validateDesign);
  const clearError = useDesignStore((s) => s.clearError);
  const { toast } = useToast();

  const busy = isGenerating || isLoading;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    clearError();
    await generatePlan(prompt.trim());
  };

  const handleRefine = async () => {
    if (!prompt.trim()) return;
    clearError();
    await refinePlan(prompt.trim());
  };

  const handleSaveVersion = async () => {
    if (!activeDesign?.id || !activeDesign?.graph) {
      toast('warning', 'No design or graph to save');
      return;
    }

    setIsSavingVersion(true);
    try {
      await api.post(`/designs/${activeDesign.id}/versions`, {
        change_summary: 'Quick save',
      });
      toast('success', 'Version saved');
    } catch {
      toast('error', 'Failed to save version');
    } finally {
      setIsSavingVersion(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !busy) {
                plannerOutput ? handleRefine() : handleGenerate();
              }
            }}
            placeholder="Describe your use case... e.g., 'Build a customer support pipeline with escalation'"
            className="flex-1 rounded border border-studio-border bg-studio-bg px-3 py-2 text-sm text-studio-text placeholder:text-studio-text-muted focus:border-studio-accent focus:outline-none"
            disabled={busy}
          />
          <button
            onClick={handleGenerate}
            disabled={busy || !prompt.trim()}
            className="rounded bg-studio-accent px-4 py-2 text-sm font-medium text-white hover:bg-studio-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>

          {plannerOutput && (
            <button
              onClick={handleRefine}
              disabled={busy || !prompt.trim()}
              className="rounded border border-studio-accent px-3 py-2 text-sm font-medium text-studio-accent hover:bg-studio-accent hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Refine
            </button>
          )}

          {activeDesign?.graph && (
            <button
              onClick={validateDesign}
              disabled={busy}
              className="rounded border border-yellow-500 px-3 py-2 text-sm font-medium text-yellow-500 hover:bg-yellow-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Validate
            </button>
          )}

          {/* Version save button */}
          <button
            onClick={handleSaveVersion}
            disabled={isSavingVersion || !activeDesign?.graph}
            className="rounded border border-studio-border px-3 py-2 text-sm text-studio-text hover:border-studio-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Save Version (Ctrl+S)"
          >
            {isSavingVersion ? 'Saving...' : 'Save'}
          </button>

          {/* Export button */}
          <button
            onClick={() => setIsExportOpen(true)}
            disabled={!activeDesign}
            className="rounded border border-studio-border px-3 py-2 text-sm text-studio-text hover:border-studio-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Export Design (Ctrl+E)"
          >
            Export
          </button>

          {/* AI Assistant toggle */}
          {onToggleChat && (
            <button
              onClick={onToggleChat}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                isChatOpen
                  ? 'bg-studio-accent text-white'
                  : 'border border-studio-accent text-studio-accent hover:bg-studio-accent hover:text-white'
              }`}
              title="AI Assistant (Ctrl+J)"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              AI
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center justify-between rounded bg-red-500/10 border border-red-500/30 px-3 py-1.5">
            <span className="text-xs text-red-400">{error}</span>
            <button onClick={clearError} className="text-xs text-red-400 hover:text-red-300 ml-2">
              Dismiss
            </button>
          </div>
        )}
      </div>

      <ExportDialog isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </>
  );
}

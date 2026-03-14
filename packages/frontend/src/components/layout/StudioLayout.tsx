'use client';

import { useState, useEffect, useCallback } from 'react';
import { StudioCanvas } from '@/components/canvas/StudioCanvas';
import { PropertiesPanel } from '@/components/properties/PropertiesPanel';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ToastProvider, useToast } from '@/components/common/Toast';
import { ExportDialog } from '@/components/export/ExportDialog';
import { AppSidebar, type AppView } from './AppSidebar';
import { LandingPage } from './LandingPage';
import { SetupWizard } from '@/components/wizard/SetupWizard';
import { useCanvasStore } from '@/store/canvas.store';
import { useDesignStore } from '@/store/design.store';
import { useValidation } from '@/hooks/useValidation';

function StudioLayoutInner() {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [activeView, setActiveView] = useState<AppView>('home');
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const { toast } = useToast();

  // Auto-validate 2s after graph changes (silent — just updates node badges)
  const { validationResult, isValidating, validate } = useValidation();

  const showProperties = selectedNodeId !== null;

  // When a design becomes active, switch to studio view
  useEffect(() => {
    if (activeDesign?.graph?.nodes?.length && activeView === 'home') {
      setActiveView('studio');
    }
  }, [activeDesign?.graph?.nodes?.length, activeView]);

  // Manual validate with toast feedback
  const handleValidate = useCallback(async () => {
    await validate();
    const result = useDesignStore.getState().validationResult;
    if (!result) return;

    if (result.valid && result.warnings.length === 0) {
      toast('success', 'All validation checks passed');
    } else if (result.valid && result.warnings.length > 0) {
      const lines = [`${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''}:`, ...result.warnings.map((w) => `• ${w.message}`)];
      toast('warning', lines.join('\n'), 8000);
    } else {
      const lines: string[] = [];
      if (result.errors.length > 0) {
        lines.push(`${result.errors.length} error${result.errors.length > 1 ? 's' : ''}:`);
        lines.push(...result.errors.map((e) => `• ${e.message}`));
      }
      if (result.warnings.length > 0) {
        lines.push(`${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''}:`);
        lines.push(...result.warnings.map((w) => `• ${w.message}`));
      }
      toast('error', lines.join('\n'), 10000);
    }
  }, [validate, toast]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === 'e') {
        e.preventDefault();
        if (activeDesign) {
          setIsExportOpen(true);
        } else {
          toast('warning', 'No design to export');
        }
      }

      if (e.key === 'Escape' && showProperties) {
        clearSelection();
      }
    },
    [toast, activeDesign, showProperties, clearSelection],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleNavigate = useCallback((view: AppView) => {
    setActiveView(view);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-studio-bg">
      {/* Sidebar — always visible */}
      <AppSidebar activeView={activeView} onNavigate={handleNavigate} />

      {/* Main Content */}
      {activeView === 'home' && (
        <LandingPage onOpenStudio={() => setActiveView('studio')} onOpenWizard={() => setActiveView('wizard')} />
      )}

      {activeView === 'wizard' && (
        <SetupWizard
          onComplete={() => setActiveView('studio')}
          onCancel={() => setActiveView('home')}
        />
      )}

      {activeView === 'templates' && (
        <LandingPage onOpenStudio={() => setActiveView('studio')} onOpenWizard={() => setActiveView('wizard')} />
      )}

      {activeView === 'gateway' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-studio-text-muted mb-3">View your gateway agents and publish history</p>
            <button
              onClick={() => setIsExportOpen(true)}
              className="rounded-lg bg-studio-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-studio-accent-hover transition-colors"
            >
              Open Publish Dialog
            </button>
          </div>
        </div>
      )}

      {activeView === 'studio' && (
        <>
          {/* Left Panel — AI Chat */}
          <div className="w-[400px] flex-shrink-0 flex flex-col border-r border-studio-border bg-studio-surface">
            <ChatPanel />
          </div>

          {/* Center — Canvas */}
          <div className="flex flex-1 flex-col overflow-hidden min-w-0">
            <div className="flex-1 relative h-full">
              <StudioCanvas />

              {/* Floating action bar — bottom of canvas */}
              {activeDesign?.graph && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-studio-border bg-studio-surface/95 backdrop-blur-sm px-4 py-2 shadow-xl">
                  <button
                    onClick={handleValidate}
                    disabled={isValidating}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-yellow-400 hover:bg-yellow-500/10 transition-colors disabled:opacity-50"
                  >
                    {isValidating ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    Validate
                    {validationResult && !validationResult.valid && (
                      <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold px-1">
                        {validationResult.errors.length}
                      </span>
                    )}
                    {validationResult?.valid && validationResult.warnings.length > 0 && (
                      <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-1">
                        {validationResult.warnings.length}
                      </span>
                    )}
                    {validationResult?.valid && validationResult.warnings.length === 0 && (
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                    )}
                  </button>
                  <div className="w-px h-4 bg-studio-border" />
                  <button
                    onClick={() => setIsExportOpen(true)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-studio-accent hover:bg-studio-accent/10 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Publish
                  </button>
                  <div className="w-px h-4 bg-studio-border" />
                  <button
                    onClick={() => setActiveView('home')}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-studio-text-muted hover:text-studio-text hover:bg-studio-bg/50 transition-colors"
                    title="Back to home"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel — Properties */}
          {showProperties && (
            <div className="w-[340px] flex-shrink-0 border-l border-studio-border bg-studio-surface overflow-y-auto animate-in slide-in-from-right-2 duration-200">
              <PropertiesPanel />
            </div>
          )}
        </>
      )}

      <ExportDialog isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
}

export function StudioLayout() {
  return (
    <ToastProvider>
      <StudioLayoutInner />
    </ToastProvider>
  );
}

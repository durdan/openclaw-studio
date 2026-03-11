'use client';

import { useState, useEffect, useCallback } from 'react';
import { StudioCanvas } from '@/components/canvas/StudioCanvas';
import { PropertiesPanel } from '@/components/properties/PropertiesPanel';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ToastProvider, useToast } from '@/components/common/Toast';
import { ExportDialog } from '@/components/export/ExportDialog';
import { useCanvasStore } from '@/store/canvas.store';
import { useDesignStore } from '@/store/design.store';

function StudioLayoutInner() {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const validateDesign = useDesignStore((s) => s.validateDesign);
  const { toast } = useToast();

  const showProperties = selectedNodeId !== null;

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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-studio-bg">
      {/* Left Panel — AI Chat (always visible) */}
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
                onClick={validateDesign}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-yellow-400 hover:bg-yellow-500/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Validate
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
            </div>
          )}
        </div>
      </div>

      {/* Right Panel — Properties (slides in when node selected) */}
      {showProperties && (
        <div className="w-[340px] flex-shrink-0 border-l border-studio-border bg-studio-surface overflow-y-auto animate-in slide-in-from-right-2 duration-200">
          <PropertiesPanel />
        </div>
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

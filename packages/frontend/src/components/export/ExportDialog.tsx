'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { useToast } from '@/components/common/Toast';
import { api } from '@/lib/api';
import { useDesignStore } from '@/store/design.store';
import type { PublishResult, ValidationResult } from '@openclaw-studio/shared';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WorkspacePreview {
  files: Record<string, string>;
  openclaw_json: Record<string, unknown>;
  agent_count: number;
  file_count: number;
}

type PublishTab = 'preview' | 'gateway';

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const validateDesign = useDesignStore((s) => s.validateDesign);
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<PublishTab>('gateway');
  const [preview, setPreview] = useState<WorkspacePreview | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Gateway connection state
  const [gatewayUrl, setGatewayUrl] = useState('ws://localhost:18789');
  const [gatewayToken, setGatewayToken] = useState('');
  const [insecureTls, setInsecureTls] = useState(false);
  const [gatewayHealth, setGatewayHealth] = useState<{ ok: boolean; message: string } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [authInfo, setAuthInfo] = useState<{ mode: string; hasDeviceKeys: boolean } | null>(null);

  // Run validation when dialog opens
  useEffect(() => {
    if (isOpen && activeDesign?.graph) {
      setIsValidating(true);
      validateDesign().then(() => {
        const result = useDesignStore.getState().validationResult;
        setValidation(result);
        setIsValidating(false);
      });
    }
    if (isOpen) {
      // Detect auth mode
      api.post<{ mode: string; hasDeviceKeys: boolean }>('/publish/gateway/auth-mode', {
        gateway_url: gatewayUrl,
      }).then(setAuthInfo).catch(() => setAuthInfo(null));
    }
    if (!isOpen) {
      setValidation(null);
      setPreview(null);
      setPublishResult(null);
      setSelectedFile(null);
      setGatewayHealth(null);
      setAuthInfo(null);
    }
  }, [isOpen, activeDesign?.graph, validateDesign]);

  const hasErrors = validation && !validation.valid;

  const getRequestBody = () => {
    if (!activeDesign) return null;
    return {
      design_id: activeDesign.id,
      graph: activeDesign.graph,
      name: activeDesign.name,
      description: activeDesign.description,
    };
  };

  const handlePreview = async () => {
    const body = getRequestBody();
    if (!body) return;

    setIsLoading(true);
    setPublishResult(null);
    try {
      const data = await api.post<WorkspacePreview>('/publish/preview', body);
      setPreview(data);
      // Auto-select first file
      const firstFile = Object.keys(data.files)[0];
      if (firstFile) setSelectedFile(firstFile);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };


  const handleDownloadFiles = () => {
    if (!preview) return;

    // Download each file as a text blob
    for (const [filePath, content] of Object.entries(preview.files)) {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.replace(/\//g, '_');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    toast('success', `Downloaded ${Object.keys(preview.files).length} files`);
  };

  const handleCheckGatewayHealth = async () => {
    setIsCheckingHealth(true);
    setGatewayHealth(null);
    try {
      const result = await api.post<{ ok: boolean; message: string }>('/publish/gateway/health', {
        gateway_url: gatewayUrl,
        gateway_token: gatewayToken || undefined,
        insecure_tls: insecureTls,
      });
      setGatewayHealth(result);
    } catch (err) {
      setGatewayHealth({ ok: false, message: err instanceof Error ? err.message : 'Health check failed' });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handlePublishToGateway = async () => {
    const body = getRequestBody();
    if (!body) return;

    setIsLoading(true);
    setPublishResult(null);
    try {
      const result = await api.post<PublishResult>('/publish', {
        ...body,
        target_type: 'gateway',
        config: {
          gateway_url: gatewayUrl,
          gateway_token: gatewayToken || undefined,
          insecure_tls: insecureTls,
        },
      });
      setPublishResult(result);
      toast(result.success ? 'success' : 'error', result.message);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Gateway publish failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Group files by workspace directory
  const groupedFiles = preview
    ? Object.keys(preview.files).reduce(
        (acc, path) => {
          const dir = path.split('/').slice(0, -1).join('/') || '.';
          if (!acc[dir]) acc[dir] = [];
          acc[dir].push(path);
          return acc;
        },
        {} as Record<string, string[]>,
      )
    : {};

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Publish to OpenClaw" maxWidth="max-w-3xl">
      <div className="space-y-4">
        {/* Validation status banner */}
        {isValidating && (
          <div className="flex items-center gap-2 rounded-lg border border-studio-border bg-studio-bg/50 px-3 py-2 text-xs text-studio-text-muted">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Validating design...
          </div>
        )}
        {validation && !isValidating && (
          <div className={`rounded-lg border p-3 text-xs ${
            validation.valid
              ? validation.warnings.length > 0
                ? 'border-yellow-500/30 bg-yellow-500/5'
                : 'border-green-500/30 bg-green-500/5'
              : 'border-red-500/30 bg-red-500/5'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                validation.valid
                  ? validation.warnings.length > 0 ? 'bg-yellow-500' : 'bg-green-500'
                  : 'bg-red-500'
              }`} />
              <span className={`font-semibold ${
                validation.valid
                  ? validation.warnings.length > 0 ? 'text-yellow-400' : 'text-green-400'
                  : 'text-red-400'
              }`}>
                {validation.valid
                  ? validation.warnings.length > 0 ? 'Valid with warnings' : 'All checks passed'
                  : `${validation.errors.length} error${validation.errors.length > 1 ? 's' : ''} found`
                }
              </span>
            </div>
            {/* Show errors */}
            {validation.errors.length > 0 && (
              <ul className="mt-2 space-y-1 text-red-400/90">
                {validation.errors.map((e, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-red-500">-</span>
                    <span>{e.message}</span>
                  </li>
                ))}
              </ul>
            )}
            {/* Show warnings */}
            {validation.warnings.length > 0 && (
              <ul className={`${validation.errors.length > 0 ? 'mt-1' : 'mt-2'} space-y-1 text-yellow-400/90`}>
                {validation.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-yellow-500">-</span>
                    <span>{w.message}</span>
                  </li>
                ))}
              </ul>
            )}
            {hasErrors && (
              <p className="mt-2 text-[10px] text-red-400/60">Fix errors before publishing</p>
            )}
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex border-b border-studio-border">
          <button
            onClick={() => { setActiveTab('gateway'); setPublishResult(null); }}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'gateway'
                ? 'border-studio-accent text-studio-accent'
                : 'border-transparent text-studio-text-muted hover:text-studio-text'
            }`}
          >
            Push to Gateway
          </button>
          <button
            onClick={() => { setActiveTab('preview'); setPublishResult(null); if (!preview) handlePreview(); }}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-studio-accent text-studio-accent'
                : 'border-transparent text-studio-text-muted hover:text-studio-text'
            }`}
          >
            Preview Files
          </button>
        </div>

        {/* ===== Preview Tab ===== */}
        {activeTab === 'preview' && (
          <>
            {!preview && (
              <div className="text-center py-8">
                <p className="text-xs text-studio-text-muted mb-4">Generating preview...</p>
              </div>
            )}

            {preview && (
              <>
                {/* Stats bar */}
                <div className="flex items-center gap-4 rounded-lg bg-studio-bg/50 border border-studio-border px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-xs text-studio-text">{preview.agent_count} agent{preview.agent_count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span className="text-xs text-studio-text">{preview.file_count} files</span>
                  </div>
                  <div className="flex-1" />
                  <button
                    onClick={() => { setPreview(null); setSelectedFile(null); handlePreview(); }}
                    className="text-[10px] text-studio-text-muted hover:text-studio-text"
                  >
                    Regenerate
                  </button>
                </div>

                {/* File browser */}
                <div className="flex gap-3 h-72 rounded-lg border border-studio-border overflow-hidden">
                  {/* File tree */}
                  <div className="w-48 flex-shrink-0 bg-studio-bg/30 border-r border-studio-border overflow-y-auto">
                    {Object.entries(groupedFiles).map(([dir, files]) => (
                      <div key={dir}>
                        <div className="px-2 py-1 text-[10px] font-semibold text-studio-accent/70 uppercase tracking-wider bg-studio-bg/50">
                          {dir === '.' ? 'root' : dir.replace('workspace', 'ws')}/
                        </div>
                        {files.map((filePath) => {
                          const fileName = filePath.split('/').pop() || filePath;
                          return (
                            <button
                              key={filePath}
                              onClick={() => setSelectedFile(filePath)}
                              className={`w-full text-left px-3 py-1 text-[11px] font-mono truncate transition-colors ${
                                selectedFile === filePath
                                  ? 'bg-studio-accent/15 text-studio-accent'
                                  : 'text-studio-text-muted hover:text-studio-text hover:bg-studio-bg/50'
                              }`}
                            >
                              {fileName}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* File content */}
                  <div className="flex-1 overflow-auto p-3">
                    {selectedFile ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-studio-accent">{selectedFile}</span>
                        </div>
                        <pre className="text-[11px] text-studio-text font-mono whitespace-pre-wrap leading-relaxed">
                          {preview.files[selectedFile]}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-xs text-studio-text-muted">Select a file to preview</p>
                    )}
                  </div>
                </div>

                {/* Download button */}
                <div className="flex justify-end border-t border-studio-border pt-3">
                  <button
                    onClick={handleDownloadFiles}
                    className="flex items-center gap-1.5 rounded-lg border border-studio-border px-3 py-2 text-xs text-studio-text hover:border-studio-accent transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Download Files
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ===== Gateway Tab (default) ===== */}
        {activeTab === 'gateway' && (
          <div className="space-y-4">
            {/* Connection settings */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-studio-text-muted uppercase tracking-wider mb-1">
                  Gateway URL
                </label>
                <input
                  type="text"
                  value={gatewayUrl}
                  onChange={(e) => { setGatewayUrl(e.target.value); setGatewayHealth(null); }}
                  className="w-full rounded-lg border border-studio-border bg-studio-bg px-3 py-2 text-xs font-mono text-studio-text focus:outline-none focus:border-studio-accent"
                  placeholder="ws://localhost:18789"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-studio-text-muted uppercase tracking-wider mb-1">
                  Auth Token <span className="text-studio-text-muted/50">(optional)</span>
                </label>
                <input
                  type="password"
                  value={gatewayToken}
                  onChange={(e) => { setGatewayToken(e.target.value); setGatewayHealth(null); }}
                  className="w-full rounded-lg border border-studio-border bg-studio-bg px-3 py-2 text-xs font-mono text-studio-text focus:outline-none focus:border-studio-accent"
                  placeholder="Bearer token"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={insecureTls}
                    onChange={(e) => { setInsecureTls(e.target.checked); setGatewayHealth(null); }}
                    className="rounded border-studio-border bg-studio-bg text-studio-accent focus:ring-studio-accent"
                  />
                  <span className="text-xs text-studio-text-muted">Allow insecure TLS (self-signed certs)</span>
                </label>

                <button
                  onClick={handleCheckGatewayHealth}
                  disabled={isCheckingHealth || !gatewayUrl}
                  className="flex items-center gap-1.5 rounded-lg border border-studio-border px-3 py-1.5 text-xs text-studio-text hover:border-studio-accent disabled:opacity-50 transition-colors"
                >
                  {isCheckingHealth ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  Test Connection
                </button>
              </div>

              {/* Health check result */}
              {gatewayHealth && (
                <div className={`rounded-lg border p-2.5 text-xs flex items-center gap-2 ${
                  gatewayHealth.ok
                    ? 'border-green-500/30 bg-green-500/5 text-green-400'
                    : 'border-red-500/30 bg-red-500/5 text-red-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${gatewayHealth.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                  {gatewayHealth.message}
                </div>
              )}
            </div>

            {/* Publish result */}
            {publishResult && (
              <div
                className={`rounded-lg border p-3 text-xs ${
                  publishResult.success
                    ? 'border-green-500/30 bg-green-500/5 text-green-400'
                    : 'border-red-500/30 bg-red-500/5 text-red-400'
                }`}
              >
                <p className="font-medium">{publishResult.success ? 'Pushed to gateway!' : 'Push failed'}</p>
                <p className="mt-0.5 text-[10px] opacity-80">{publishResult.message}</p>
                {publishResult.details && (
                  <div className="mt-2 text-[10px] opacity-70 space-y-0.5">
                    <p>Agents: {(publishResult.details as Record<string, unknown>).agent_count as number}</p>
                    <p>Files written: {(publishResult.details as Record<string, unknown>).files_written as number}</p>
                  </div>
                )}
              </div>
            )}

            {/* Push button */}
            <div className="flex justify-end border-t border-studio-border pt-3">
              <button
                onClick={handlePublishToGateway}
                disabled={isLoading || !activeDesign?.graph || !!hasErrors || !gatewayUrl}
                className="flex items-center gap-1.5 rounded-lg bg-studio-accent px-5 py-2 text-xs font-medium text-white hover:bg-studio-accent-hover disabled:opacity-50 transition-colors"
                title={hasErrors ? 'Fix validation errors before publishing' : !gatewayUrl ? 'Enter gateway URL' : undefined}
              >
                {isLoading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Pushing...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    {hasErrors ? 'Fix errors first' : 'Push to Gateway'}
                  </>
                )}
              </button>
            </div>

            <div className="text-[10px] text-studio-text-muted/50 text-center space-y-0.5">
              <p>Pushes workspace files directly to a running OpenClaw Gateway via WebSocket RPC (protocol v3)</p>
              {authInfo && (
                <p>
                  Auth: <span className="text-studio-text-muted">{authInfo.mode === 'device' ? 'Device Identity (Ed25519 signing)' : 'Token-only (Control UI)'}</span>
                  {authInfo.mode === 'token' && !authInfo.hasDeviceKeys && (
                    <span className="text-yellow-500/70"> — install OpenClaw locally for device auth</span>
                  )}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

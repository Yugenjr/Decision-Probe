"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore, Workspace } from '@/store/workspaceStore';
import { BlockRenderer } from '@/components/workspace/BlockRenderer';
import { useDropzone } from 'react-dropzone';
import { SettingsModal } from '@/components/workspace/SettingsModal';
import { workspaceApi } from '@/api/workspace';

export default function Home() {
  const { 
    activeWorkspace, setActiveWorkspace, applyPatches,
    isThinking, setIsThinking,
    errorMessage, setErrorMessage,
    appendMessage, appendLog, clearExecutionLogs
  } = useWorkspaceStore();
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const thinkingStages = [
    "Planning investigation",
    "Collecting context",
    "Analyzing evidence",
    "Evaluating hypotheses",
    "Generating decision",
    "Updating workspace"
  ];
  const [thinkingStageIndex, setThinkingStageIndex] = useState(0);

  useEffect(() => { loadWorkspaces(); }, []);

  const loadWorkspaces = async () => {
    setIsLoading(true);
    setIsOffline(false);
    try {
      const data = await workspaceApi.getWorkspaces();
      setWorkspaces(data);
      if (data.length > 0) {
        if (activeWorkspace) {
          const found = data.find(w => w.id === activeWorkspace.id);
          setActiveWorkspace(found || data[0]);
        } else {
          setActiveWorkspace(data[0]);
        }
      } else {
        setActiveWorkspace(null);
      }
    } catch (e) { 
      console.error(e); 
      setIsOffline(true);
    }
    finally { setIsLoading(false); }
  };

  const handleCreateWorkspace = async () => {
    try {
      const ws = await workspaceApi.createWorkspace(`Investigation ${workspaces.length + 1}`);
      setWorkspaces([...workspaces, ws]);
      setActiveWorkspace(ws);
    } catch (e) { console.error(e); }
  };

  const handleRenameSubmit = async () => {
    if (!activeWorkspace || !newTitle.trim() || newTitle === activeWorkspace.title) {
      setIsRenaming(false); return;
    }
    try {
      const updated = await workspaceApi.updateWorkspace(activeWorkspace.id, newTitle);
      setActiveWorkspace(updated);
      setWorkspaces(workspaces.map(w => w.id === updated.id ? updated : w));
    } catch (e) { console.error(e); }
    finally { setIsRenaming(false); }
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace) return;
    try {
      await workspaceApi.deleteWorkspace(activeWorkspace.id);
      const remaining = workspaces.filter(w => w.id !== activeWorkspace.id);
      setWorkspaces(remaining);
      setActiveWorkspace(remaining.length > 0 ? remaining[0] : null);
    } catch (e) { console.error(e); }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (!activeWorkspace || acceptedFiles.length === 0) return;
    try {
      const block = await workspaceApi.uploadResource(activeWorkspace.id, acceptedFiles[0]);
      applyPatches([{ type: 'PatchOperation', operations: [{ op: 'append_block', payload: block }] }]);
    } catch (e) { console.error("Failed to upload resource:", e); }
  };

  const { getInputProps, open } = useDropzone({ onDrop, noClick: true, noKeyboard: true });
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const streamEndRef = useRef<HTMLDivElement>(null);
  
  const currentLogs = activeWorkspace?.execution_logs || [];
  const currentConversation = activeWorkspace?.conversations || [];

  useEffect(() => { chatInputRef.current?.focus(); }, [activeWorkspace]);
  useEffect(() => { streamEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [currentConversation, currentLogs]);

  useEffect(() => {
    let interval: any;
    if (isThinking) {
      setThinkingStageIndex(0);
      interval = setInterval(() => {
        setThinkingStageIndex(prev => Math.min(prev + 1, thinkingStages.length - 1));
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [isThinking]);

  const handleChat = async () => {
    if (!chatMessage || !activeWorkspace || isThinking) return;
    const msg = chatMessage;
    setIsThinking(true);
    setErrorMessage("");
    setChatMessage("");
    clearExecutionLogs();
    
    try {
      const response = await fetch(`http://localhost:8005/api/v1/workspaces/${activeWorkspace.id}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      if (!response.ok) throw new Error("Investigation failed.");
      if (!response.body) throw new Error("No readable stream");
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false, buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          let eolIndex;
          while ((eolIndex = buffer.indexOf('\n\n')) >= 0) {
            const eventChunk = buffer.slice(0, eolIndex).trim();
            buffer = buffer.slice(eolIndex + 2);
            if (!eventChunk) continue;
            const lines = eventChunk.split('\n');
            let dataStr = "";
            for (const line of lines) { if (line.startsWith('data: ')) dataStr += line.slice(6); }
            dataStr = dataStr.trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'error') {
                setErrorMessage(data.content || "Runtime error.");
                setIsThinking(false); break;
              }
              if (data.type === 'PatchOperation') {
                applyPatches([data]);
              } else if (data.type === 'execution_log') {
                appendLog(data.payload);
              } else if (data.type === 'chat_message') {
                appendMessage(data.payload);
              }
            } catch (e) {
              setErrorMessage("Stream parse error.");
            }
          }
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Investigation failed.");
    } finally {
      setIsThinking(false);
      chatInputRef.current?.focus();
    }
  };

  const blocks = activeWorkspace?.blocks || [];
  const hasBlocks = blocks.length > 0;

  if (isOffline) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-danger/10">
            <span className="text-xl text-danger">⚠️</span>
          </div>
          <div>
            <h2 className="text-base font-medium text-fg-strong">Backend Offline</h2>
            <p className="mt-1 text-[13px] text-fg-muted">Could not connect to the DecisionVerse API.</p>
          </div>
          <button 
            onClick={loadWorkspaces}
            className="mt-2 rounded bg-foreground px-4 py-2 text-[12.5px] font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <input {...getInputProps()} />

      {/* ──── EXPLORER ──── */}
      <aside className="flex h-full w-[240px] min-w-[240px] flex-col bg-panel border-r border-border-subtle">
        {/* brand */}
        <div className="flex h-11 shrink-0 items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <div className="grid h-4 w-4 place-items-center">
              <span className="block h-2 w-2 rotate-45 bg-fg-strong" />
            </div>
            <span className="text-[13px] font-medium tracking-tight text-fg-strong">DecisionVerse</span>
          </div>
        </div>

        {/* new investigation */}
        <button 
          onClick={handleCreateWorkspace}
          className="mx-3 mb-2 flex h-7 items-center justify-between rounded-md border border-border-subtle px-2 text-[12px] text-foreground transition-colors hover:bg-raised"
        >
          <span className="flex items-center gap-2">
            <span className="mono text-fg-muted">+</span>
            New Investigation
          </span>
        </button>

        {/* workspace list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-2">
          {isLoading ? (
            <div className="px-3 py-2 text-[12px] text-fg-muted">Loading...</div>
          ) : (
            <div className="mt-1">
              <div className="px-3 pb-1 text-micro">Investigations</div>
              <ul>
                {workspaces.map(ws => {
                  const active = ws.id === activeWorkspace?.id;
                  return (
                    <li key={ws.id}>
                      <button
                        onClick={() => setActiveWorkspace(ws)}
                        className={`group relative flex h-[26px] w-full items-center gap-2 pr-2 pl-3 text-left text-[12.5px] transition-colors ${
                          active ? 'bg-raised text-fg-strong' : 'text-foreground hover:bg-raised/60'
                        }`}
                      >
                        {active && <span className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r bg-accent" />}
                        <span className="min-w-0 flex-1 truncate">{ws.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="shrink-0 border-t border-border-subtle px-3 py-2">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 text-[11.5px] text-fg-muted hover:text-foreground transition-colors"
          >
            Settings
          </button>
        </div>
      </aside>

      {/* ──── WORKSPACE ──── */}
      <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
        {/* breadcrumb */}
        <div className="flex h-7 shrink-0 items-center justify-between border-b border-border-subtle px-4 text-[11.5px] text-fg-muted">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate">DecisionVerse</span>
            <span className="text-fg-muted/60">/</span>
            {activeWorkspace ? (
              isRenaming ? (
                <input 
                  autoFocus value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setIsRenaming(false); }}
                  className="mono text-foreground bg-transparent focus:outline-none border-b border-accent min-w-[120px]"
                />
              ) : (
                <span 
                  className="mono text-foreground truncate cursor-text"
                  onDoubleClick={() => { setNewTitle(activeWorkspace.title); setIsRenaming(true); }}
                >
                  {activeWorkspace.title}
                </span>
              )
            ) : (
              <span className="text-fg-muted">No investigation</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {activeWorkspace && (
              <>
                <button onClick={open} className="flex h-5 items-center gap-1 rounded border border-border-subtle bg-raised/40 px-2 text-[11.5px] text-foreground hover:bg-raised">
                  Upload
                </button>
                <button onClick={handleDeleteWorkspace} className="flex h-5 items-center gap-1 rounded border border-border-subtle bg-raised/40 px-2 text-[11.5px] text-foreground hover:bg-raised hover:text-danger">
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* scroll region */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeWorkspace && hasBlocks && (
            <>
              {/* header */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="truncate text-[15px] font-medium text-fg-strong">{activeWorkspace.title}</h1>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-fg-muted">
                      <span className="flex items-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-info opacity-50" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-info" />
                        </span>
                        Active
                      </span>
                      <span>{blocks.length} sections</span>
                      <span>Updated <span className="mono text-foreground">{new Date(activeWorkspace.metadata?.updated_at || '').toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* blocks as sections */}
              {blocks.map(block => (
                <BlockRenderer key={block.id} block={block} />
              ))}
              <div className="h-16" />
            </>
          )}

          {activeWorkspace && !hasBlocks && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <p className="text-[13px] text-fg-muted mb-6">No investigation data yet.</p>
              <div className="flex flex-col gap-2 text-[12.5px]">
                <button onClick={() => { setChatMessage("Investigate this incident"); chatInputRef.current?.focus(); }} className="text-accent hover:text-accent-foreground transition-colors">
                  → Investigate this incident
                </button>
                <button onClick={open} className="text-accent hover:text-accent-foreground transition-colors">
                  → Upload evidence files
                </button>
                <button onClick={() => { setChatMessage("Determine root cause"); chatInputRef.current?.focus(); }} className="text-accent hover:text-accent-foreground transition-colors">
                  → Determine root cause
                </button>
              </div>
              <div className="mt-12 text-[11px] text-fg-muted">
                Future: CloudWatch · Grafana · GitHub · Jira · Slack
              </div>
            </div>
          )}

          {!activeWorkspace && (
            <div className="flex items-center justify-center h-full text-[13px] text-fg-muted">
              Select or create an investigation to begin.
            </div>
          )}
        </div>
      </div>

      {/* ──── COMMAND CENTER ──── */}
      <aside className="flex h-full w-[340px] min-w-[340px] flex-col bg-panel border-l border-border-subtle">
        {/* header */}
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border-subtle px-3">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-fg-strong">Command Center</span>
            {activeWorkspace && (
              <span className="mono text-[10.5px] text-fg-muted">· {activeWorkspace.title}</span>
            )}
          </div>
          {isThinking && (
            <span className="flex items-center gap-1 text-[11px] text-fg-muted">
              <span className="mono text-info">⟳</span> running
            </span>
          )}
        </div>

        {/* stream */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
          {errorMessage && (
            <div className="mb-4 text-[12px] text-danger border-l-2 border-danger pl-2 bg-danger/5 py-1">
              {errorMessage}
            </div>
          )}

          {currentConversation.map((msg, i) => (
            <div key={i} className="fade-in mb-4">
              <div className="mb-1 flex items-center gap-2 text-[11px]">
                <span className="mono text-fg-muted">
                  {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                </span>
                <span className={msg.role === 'user' ? 'text-fg-strong' : 'text-accent'}>
                  {msg.role === 'user' ? 'You' : 'DecisionVerse'}
                </span>
              </div>
              <div className="pl-8 text-[12.5px] text-foreground">
                {msg.content}
              </div>
            </div>
          ))}

          {currentLogs.length > 0 && (
            <ul className="mt-1 space-y-0.5 pl-8">
              {currentLogs.map((log, i) => (
                <li key={i} className="flex items-center gap-2 text-[11.5px]">
                  <span className={`mono text-[11px] ${log.success ? 'text-success' : 'text-danger'}`}>
                    {log.success ? '✓' : '✗'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-fg-muted">{log.message}</span>
                </li>
              ))}
              {isThinking && (
                <li className="ml-4 mt-1 h-px w-24 indeterminate">
                  <span className="indeterminate-bar" />
                </li>
              )}
            </ul>
          )}

          {isThinking && (
            <div className="fade-in mb-4 mt-2">
              <div className="mb-1 flex items-center gap-2 text-[11px]">
                <span className="mono text-fg-muted">now</span>
                <span className="text-accent">DecisionVerse</span>
              </div>
              <div className="pl-8 text-[12.5px] text-fg-muted">
                {thinkingStages[thinkingStageIndex]}<span className="caret ml-0.5" />
              </div>
            </div>
          )}
          <div ref={streamEndRef} />
        </div>

        {/* composer */}
        <div className="shrink-0 px-3 pb-3">
          <div className="rounded-md border border-border bg-raised">
            <textarea
              ref={chatInputRef}
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isThinking) handleChat();
                }
              }}
              disabled={isThinking}
              rows={3}
              placeholder="Investigate this incident…"
              className="block w-full resize-none bg-transparent px-2.5 py-2 text-[12.5px] text-foreground placeholder:text-fg-muted focus:outline-none"
            />
            <div className="flex items-center justify-between border-t border-border-subtle px-2 py-1.5">
              <div className="flex items-center gap-2 text-[11px] text-fg-muted">
                <button onClick={() => setChatMessage("/investigate ")} className="mono hover:text-foreground">/investigate</button>
                <button onClick={() => setChatMessage("/explain ")} className="mono hover:text-foreground">/explain</button>
                <button onClick={() => setChatMessage("/summarise ")} className="mono hover:text-foreground">/summarise</button>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                run <span className="kbd">⏎</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

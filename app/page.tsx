"use client";

import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [cam, setCam] = useState<any>(null);
  const [uploadedFilesList, setUploadedFilesList] = useState<string[]>([]);
  const [selectedFilesNames, setSelectedFilesNames] = useState<string[]>([]);
  const [researchPlan, setResearchPlan] = useState<any>(null);
  const [researchMessages, setResearchMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [researchInput, setResearchInput] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const appendLog = (s: string) => setLog((l) => [s, ...l].slice(0, 50));

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [researchMessages, log]);

  async function ingestRun(run_id: string) {
    setLoading(true);
    appendLog("Starting ingestion...");
    try {
      const fd = new FormData();
      fd.append("run_id", run_id);
      const res = await fetch(`${backend}/ingest`, { method: "POST", body: fd });
      const j = await res.json();
      appendLog(`Ingest finished: ${j.report_path || JSON.stringify(j).slice(0, 200)}`);
    } catch (err) {
      appendLog(`Ingest error: ${String(err)}`);
    }
    setLoading(false);
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLoading(true);
    appendLog("Uploading files...");

    const fd = new FormData();
    Array.from(files).forEach((f: File) => fd.append("files", f));

    try {
      const res = await fetch(`${backend}/upload`, { method: "POST", body: fd });
      const j = await res.json();
      if (j.run_id) {
        setRunId(j.run_id);
        setUploadedFilesList(j.filenames || []);
        appendLog(`Uploaded run_id ${j.run_id}`);
        await ingestRun(j.run_id);
      } else {
        appendLog(`Upload failed`);
      }
    } catch (err) {
      appendLog(`Upload error: ${String(err)}`);
    }
    setLoading(false);
  }

  const handleFolderUpload = async () => {
    try {
      setLoading(true);
      appendLog("Uploading files from folder...");
      const res = await fetch("/api/uploadFromFolder", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        appendLog(`Uploaded files: ${data.files.map((f: any) => f.name).join(", ")}`);
      } else {
        appendLog(`Upload failed: ${data.error}`);
      }
    } catch (error) {
      appendLog(`Upload error: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleNotesSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!runId) return appendLog("No run_id. Upload files first.");
    setLoading(true);
    appendLog("Saving primary insights...");
    try {
      const fd = new FormData();
      fd.append("run_id", runId);
      fd.append("notes", notes);
      await fetch(`${backend}/primary_insights`, { method: "POST", body: fd });
      appendLog(`Notes saved`);
    } catch (err) {
      appendLog(`Notes error: ${String(err)}`);
    }
    setLoading(false);
  }

  async function fetchCam() {
    if (!runId) return appendLog("No run_id. Upload files first.");
    setLoading(true);
    appendLog("Fetching CAM...");
    try {
      const res = await fetch(`${backend}/cam/${runId}`);
      const j = await res.json();
      setCam(j);
      appendLog("CAM fetched");
    } catch (err) {
      appendLog(`CAM error: ${String(err)}`);
    }
    setLoading(false);
  }

  async function initiateResearch() {
    if (!runId) return appendLog("No run_id. Upload files first.");
    setLoading(true);
    appendLog("Initiating research agent...");
    try {
      const fd = new FormData();
      fd.append("run_id", runId);
      const res = await fetch(`${backend}/research/initiate`, { method: "POST", body: fd });
      const j = await res.json();
      appendLog(`Research initiated`);
      setResearchPlan(j.llm_raw || j);
    } catch (err) {
      appendLog(`Research error: ${String(err)}`);
    }
    setLoading(false);
  }

  async function researchChatSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!runId) return appendLog("No run_id. Upload files first.");
    if (!researchInput.trim()) return;

    const msg = researchInput;
    setResearchMessages((m) => [...m, { role: "user", text: msg }]);
    setResearchInput("");
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("run_id", runId);
      fd.append("message", msg);
      const res = await fetch(`${backend}/research/chat`, { method: "POST", body: fd });
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
      const j = await res.json();
      const assistant = j.assistant || j;
      setResearchMessages((m) => [...m, { role: "assistant", text: JSON.stringify(assistant).slice(0, 1000) }]);
    } catch (err) {
      appendLog(`Research chat error: ${String(err)}`);
      setResearchMessages((m) => [...m, { role: "assistant", text: "Error: Unable to fetch response." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen w-full bg-[#0a0f1a] text-slate-200 flex overflow-hidden font-sans selection:bg-indigo-500/30">
      
      <aside className="w-80 bg-[#111827] border-r border-slate-800 flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#111827]/80 backdrop-blur">
          <h2 className="text-lg font-bold text-slate-100 tracking-tight">Sources</h2>
          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
            {uploadedFilesList.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          <div className="space-y-4">
            <input
              type="file"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => {
                const fl = e.target.files;
                setFiles(fl);
                if (fl) setSelectedFilesNames(Array.from(fl).map((f) => f.name));
                else setSelectedFilesNames([]);
              }}
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 px-4 bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-2xl text-slate-400 text-sm font-medium hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Select Files
            </button>

            {selectedFilesNames.length > 0 && (
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-inner">
                <p className="text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-widest">Pending Upload</p>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                  {selectedFilesNames.map((n, i) => (
                    <div key={i} className="text-sm text-slate-300 truncate bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">{n}</div>
                  ))}
                </div>
                <button
                  onClick={() => handleUpload(files)}
                  disabled={loading}
                  className="mt-4 w-full bg-indigo-600 text-white text-sm py-2.5 rounded-xl font-semibold hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:hover:shadow-none"
                >
                  Upload Selected
                </button>
              </div>
            )}

            <button
              onClick={handleFolderUpload}
              disabled={loading}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm py-2.5 rounded-xl font-medium hover:bg-slate-700 hover:border-slate-600 transition-all duration-200 active:scale-95 disabled:opacity-50"
            >
              Upload from Folder
            </button>
          </div>

          <div className="pt-5 border-t border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-widest">Added Sources</p>
            {uploadedFilesList.length === 0 ? (
              <p className="text-sm text-slate-600 italic bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50 text-center">No sources uploaded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {uploadedFilesList.map((fn, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-all duration-200 cursor-default group">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0 group-hover:scale-110 transition-transform">
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-300 truncate">{fn}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative min-w-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0f1a] to-[#0a0f1a]">
        <header className="h-16 flex items-center justify-between px-8 bg-[#0a0f1a]/60 backdrop-blur-xl border-b border-slate-800/50 z-10 absolute top-0 w-full">
          <h1 className="font-bold text-slate-100 text-lg tracking-wide">Research Guide</h1>
          {runId && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-indigo-300 font-mono bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 shadow-sm">
                Run: {runId}
              </span>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8 pt-24 pb-36 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-8">
            {researchMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-72 text-center mt-10">
                <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6 text-indigo-400 border border-indigo-500/20 shadow-[0_0_30px_rgba(79,70,229,0.15)]">
                  <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-200 mb-2">Upload sources to begin</h3>
                <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                  Add your documents in the sources panel, then ask questions to analyze, summarize, or extract insights.
                </p>
              </div>
            )}

            {researchMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div 
                  className={`max-w-[85%] rounded-3xl p-5 text-[15px] leading-relaxed shadow-lg ${
                    m.role === "user" 
                      ? "bg-indigo-600 text-white rounded-tr-sm shadow-indigo-900/20" 
                      : "bg-[#111827] border border-slate-700 text-slate-200 rounded-tl-sm shadow-black/20"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#111827] border border-slate-700 rounded-3xl rounded-tl-sm p-5 shadow-lg flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} className="h-4" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#0a0f1a] via-[#0a0f1a]/95 to-transparent pt-12 pb-8 px-8 pointer-events-none">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <form 
              onSubmit={researchChatSend} 
              className="bg-[#111827]/90 backdrop-blur-md border border-slate-700 rounded-full p-2 flex items-center shadow-[0_8px_30px_rgba(0,0,0,0.4)] focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all duration-300"
            >
              <input 
                value={researchInput} 
                onChange={(e) => setResearchInput(e.target.value)} 
                placeholder="Ask a question about your sources..." 
                className="flex-1 bg-transparent px-5 py-3 outline-none text-slate-200 placeholder-slate-500 text-[15px]"
                disabled={!runId || loading}
              />
              <button
                type="submit"
                disabled={!runId || loading || !researchInput.trim()}
                className="bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-all duration-200 active:scale-90 disabled:opacity-40 disabled:hover:shadow-none disabled:active:scale-100 disabled:bg-slate-700 ml-2"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="ml-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </main>

      <aside className="w-[340px] bg-[#111827] border-l border-slate-800 flex flex-col z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.2)] relative">
        <div className="p-6 border-b border-slate-800 bg-[#111827]/80 backdrop-blur">
          <h2 className="text-lg font-bold text-slate-100 tracking-tight">Studio</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Insights and metadata</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 custom-scrollbar">
          <form onSubmit={handleNotesSubmit} className="flex flex-col gap-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Primary Notes</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={5} 
              className="w-full p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 focus:bg-amber-500/10 resize-none transition-all duration-200 placeholder-slate-600" 
              placeholder="Capture primary insights here..." 
            />
            <button
              type="submit"
              disabled={!runId || loading}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm py-2.5 rounded-xl font-medium hover:bg-slate-700 hover:border-slate-600 transition-all duration-200 active:scale-95 disabled:opacity-50"
            >
              Save Notes
            </button>
          </form>

          <div className="pt-5 border-t border-slate-800 space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actions</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={initiateResearch} 
                disabled={!runId || loading}
                className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs py-2.5 px-3 rounded-xl font-semibold hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all duration-200 active:scale-95 disabled:opacity-50"
              >
                Start Agent
              </button>
              <button 
                onClick={fetchCam} 
                disabled={!runId || loading}
                className="bg-slate-800 text-slate-300 border border-slate-700 text-xs py-2.5 px-3 rounded-xl font-semibold hover:bg-slate-700 transition-all duration-200 active:scale-95 disabled:opacity-50"
              >
                Fetch CAM
              </button>
              <button 
                onClick={() => { setResearchMessages([]); setResearchPlan(null); }} 
                className="col-span-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs py-2.5 px-3 rounded-xl font-semibold hover:bg-rose-500/20 hover:border-rose-500/30 transition-all duration-200 active:scale-[0.98]"
              >
                Clear Research
              </button>
            </div>
          </div>

          {cam && (
             <div className="pt-5 border-t border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                <span>CAM Output</span>
              </label>
              <div className="mt-3 bg-[#0a0f1a] border border-slate-800 text-emerald-400/90 rounded-2xl p-4 text-xs font-mono overflow-auto max-h-48 custom-scrollbar shadow-inner">
                <pre>{JSON.stringify(cam, null, 2)}</pre>
              </div>
            </div>
          )}

          {researchPlan && (
            <div className="pt-5 border-t border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Research Plan</label>
              <div className="mt-3 bg-indigo-900/20 text-indigo-200 rounded-2xl p-4 text-xs overflow-auto max-h-48 border border-indigo-500/20 custom-scrollbar shadow-inner">
                <pre className="whitespace-pre-wrap font-sans leading-relaxed">{JSON.stringify(researchPlan, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {log.length > 0 && (
          <div className="h-36 border-t border-slate-800 bg-[#0a0f1a]/80 backdrop-blur p-4 overflow-y-auto custom-scrollbar">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 sticky top-0 bg-[#0a0f1a]/80 py-1 backdrop-blur-sm z-10">System Logs</p>
            <div className="space-y-1.5">
              {log.map((l, i) => (
                <div key={`log-${i}`} className="text-[11px] text-slate-500 font-mono break-all hover:text-slate-400 transition-colors">{l}</div>
              ))}
            </div>
          </div>
        )}
      </aside>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}} />
    </div>
  );
}
import React, { useState, useMemo } from "react";
import { 
  Users, Send, CheckCircle2, AlertCircle, RefreshCw, 
  Layers, Mail, Sparkles, Plus, Trash2, Search, 
  CheckSquare, Square, Copy, ChevronDown, ChevronLeft, ChevronRight,
  Database, Zap
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Founder, UserProfile } from "../types";

interface EmailTabProps {
  founders: Founder[];
  setFounders: React.Dispatch<React.SetStateAction<Founder[]>>;
  loading: boolean;
  stats: { total: number; sent: number; replied: number; failed: number };
  gmailAccessToken: string | null;
  gmailUserEmail: string | null;
  isConnectingGmail: boolean;
  handleConnectGmail: () => void;
  handleDisconnectGmail: () => void;
  templateSubject: string;
  setTemplateSubject: (val: string) => void;
  templateBody: string;
  setTemplateBody: (val: string) => void;
  resolveTemplate: (subject: string, body: string, f: Founder) => { subject: string; body: string };
  handleSendGmailInstantly: (f: Founder) => void;
  handleCopyPitch: (f: Founder, s: string, b: string) => void;
  handleDeleteFounder: (id: string) => void;
  handleUpdateStatus: (id: string, s: Founder["status"]) => void;
  handleToggleExpandRow: (id: string) => void;
  expandedFounderId: string | null;
  renderEmailBody: (b: string) => React.ReactNode;
  
  isQuickPasteOpen: boolean;
  setIsQuickPasteOpen: (val: boolean) => void;
  bulkCsvInput: string;
  setBulkCsvInput: (val: string) => void;
  csvImportStatus: Founder["status"];
  setCsvImportStatus: (val: Founder["status"]) => void;
  handleBulkCsvImport: () => void;
  isCsvImporting: boolean;

  handleResetSentFailed: () => void;
  handleDeleteSentFailed: () => void;
  handleInstantRestore500: () => void;
  preseededFounders: any[];
  
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  handleBatchApplyTemplate: (all: boolean) => void;
  handleBatchShootSelectedAPI: () => void;
  handleBatchDeleteSelected: () => void;
  setAddModalOpen: (val: boolean) => void;
  profile: UserProfile;
  
  showOnboarding: boolean;
  setShowOnboarding: (val: boolean) => void;
}

export default function EmailTab({
  founders,
  setFounders,
  loading,
  stats,
  gmailAccessToken,
  gmailUserEmail,
  isConnectingGmail,
  handleConnectGmail,
  handleDisconnectGmail,
  templateSubject,
  setTemplateSubject,
  templateBody,
  setTemplateBody,
  resolveTemplate,
  handleSendGmailInstantly,
  handleCopyPitch,
  handleDeleteFounder,
  handleUpdateStatus,
  handleToggleExpandRow,
  expandedFounderId,
  renderEmailBody,
  
  isQuickPasteOpen,
  setIsQuickPasteOpen,
  bulkCsvInput,
  setBulkCsvInput,
  csvImportStatus,
  setCsvImportStatus,
  handleBulkCsvImport,
  isCsvImporting,

  handleResetSentFailed,
  handleDeleteSentFailed,
  handleInstantRestore500,
  preseededFounders,

  selectedIds,
  setSelectedIds,
  handleBatchApplyTemplate,
  handleBatchShootSelectedAPI,
  handleBatchDeleteSelected,
  setAddModalOpen,
  profile,
  
  showOnboarding,
  setShowOnboarding
}: EmailTabProps) {
  
  // AI Personalization state
  const [isAiPersonalizing, setIsAiPersonalizing] = useState(false);
  const [aiProgress, setAiProgress] = useState({ current: 0, total: 0 });

  // Table search and filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [aiTone, setAiTone] = useState("Authentic & Deep Connection");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  // Extract unique sectors
  const uniqueSectors = useMemo(() => {
    const set = new Set<string>();
    founders.forEach(f => {
      if (f.sector) set.add(f.sector);
    });
    return Array.from(set).slice(0, 15);
  }, [founders]);

  // Filter logic
  const filtered = useMemo(() => {
    return founders.filter(f => {
      const q = search.toLowerCase();
      const matchesSearch = 
        f.name.toLowerCase().includes(q) ||
        f.company.toLowerCase().includes(q) ||
        (f.sector && f.sector.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "All" || f.status === statusFilter;
      const matchesSector = sectorFilter === "All" || f.sector === sectorFilter;

      return matchesSearch && matchesStatus && matchesSector;
    });
  }, [founders, search, statusFilter, sectorFilter]);

  // Paginated List
  const totalRows = filtered.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, currentPage]);

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const pageIds = paginatedList.map(f => f.id);
    const allChecked = pageIds.every(id => selectedIds.includes(id));
    if (allChecked) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const added = pageIds.filter(id => !prev.includes(id));
        return [...prev, ...added];
      });
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Onboarding walkthrough */}
      {showOnboarding && (
        <div className="bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-50 border-2 border-indigo-200/60 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden animate-in fade-in slide-in-from-top-4">
          <button 
            onClick={() => {
              setShowOnboarding(false);
              localStorage.setItem("show_onboarding_guide", "false");
            }}
            className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            title="Dismiss Tutorial"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shrink-0 hidden sm:block">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-4 text-left">
              <div>
                <h2 className="text-sm font-black text-indigo-950 flex items-center gap-2 uppercase tracking-wider">
                  🚀 Setup outreach test case in 4 steps
                </h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Connect your inbox, configure templates, customize details, and send out genuine outreach safely:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/60">
                  <div className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mb-2 font-mono">STEP 1</div>
                  <h4 className="text-xs font-extrabold text-slate-800">Review Targets</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Review your leads in the directory list. You can add targets manually or import lists from CSV.
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/60">
                  <div className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mb-2 font-mono">STEP 2</div>
                  <h4 className="text-xs font-extrabold text-slate-800">Connect Gmail Inbox</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Scroll down and click <strong>Connect Gmail Inbox</strong> to safely log in using standard Google popup authentication.
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/60">
                  <div className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mb-2 font-mono">STEP 3</div>
                  <h4 className="text-xs font-extrabold text-slate-800">Personalize Templates</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Check a prospect, adjust the placeholders in the subject/body fields, and click <strong>Apply Template to Checked</strong>.
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/60">
                  <div className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mb-2 font-mono">STEP 4</div>
                  <h4 className="text-xs font-extrabold text-slate-800">Shoot Outreach</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Click the <strong>Send</strong> icon to dispatch emails via Gmail API, or click <strong>Shoot Selected</strong> to send in bulk.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Targets", value: stats.total, icon: Users, color: "text-indigo-600 bg-indigo-50 border-indigo-100/60" },
          { label: "Emails Sent", value: stats.sent, icon: Send, color: "text-blue-600 bg-blue-50 border-blue-100/60" },
          { label: "Replies Received", value: stats.replied, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-100/60" },
          { label: "Bounced / Failed", value: stats.failed, icon: AlertCircle, color: "text-rose-600 bg-rose-50 border-rose-100/60" }
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 shadow-2xs hover:shadow-xs transition-all duration-200">
              <div className={`p-2.5 rounded-xl border ${item.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                <p className="text-xl font-black text-slate-800 mt-0.5">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Campaign Warnings */}
      {(stats.sent > 0 || stats.failed > 0) && (
        <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                Reset Sent / Failed Outreach Statuses?
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                You have <span className="font-extrabold text-rose-700">{stats.sent + stats.failed}</span> records marked as Sent or Failed. You can reset them to Draft, or permanently clear them.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={handleResetSentFailed}
              disabled={loading}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Reset to Draft 🚀
            </button>
            <button
              onClick={handleDeleteSentFailed}
              disabled={loading}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:bg-rose-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Permanently Delete Sent Leads 🗑️
            </button>
          </div>
        </div>
      )}

      {stats.total < preseededFounders.length && (
        <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3 text-left">
            <Database className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                Missing Preseeded Leads?
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Restore the preloaded list of {preseededFounders.length} Indian startup founders.
              </p>
            </div>
          </div>
          <button
            onClick={handleInstantRestore500}
            disabled={loading}
            className="shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4.5 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:bg-indigo-400"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Restore Database 🚀
          </button>
        </div>
      )}

      {/* Subject & Body Editor */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <Layers className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">One Subject &amp; Content Template Mixer</h2>
              <p className="text-xs text-slate-500 font-medium">Outreach template editor. Placeholders resolve live for each prospect.</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-left">
              <span className="font-bold">Placeholder Instructions:</span> Use <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 font-mono font-bold text-amber-900">[Name]</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 font-mono font-bold text-amber-900">[Company]</code>, and <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 font-mono font-bold text-amber-900">[Sector]</code>.
            </div>
          </div>

          {/* Gmail API Connection Badge */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5 text-left">
              <div className={`p-1.5 rounded-lg shrink-0 ${gmailAccessToken ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  Gmail Outreach Engine
                  {gmailAccessToken ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-normal">
                      ● Active API
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-normal">
                      Demo Sandbox
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-medium">
                  {gmailAccessToken ? (
                    <>Connected as <span className="font-extrabold text-slate-700">{gmailUserEmail}</span>. Bulk campaigns will send from your account.</>
                  ) : (
                    <>Currently in demo/simulation mode. Connect your Gmail to send genuine emails.</>
                  )}
                </p>
              </div>
            </div>

            <div className="shrink-0 self-end md:self-auto">
              {gmailAccessToken ? (
                <button
                  onClick={handleDisconnectGmail}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer transition-colors"
                >
                  Disconnect Account
                </button>
              ) : (
                <button
                  onClick={handleConnectGmail}
                  disabled={isConnectingGmail}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shadow-xs hover:shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isConnectingGmail ? "Connecting..." : "Connect Gmail Inbox"}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 text-left">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Subject Line Template</label>
              <input 
                type="text" 
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400"
                placeholder="Want to work with [Company] | Why Me?"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Body Pitch Template</label>
              <textarea 
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                rows={10}
                className="w-full p-3.5 border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-800 focus:outline-none focus:border-slate-400 font-sans"
                placeholder="Draft your pitch..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Directory Table Workspace */}
      <div className="space-y-4">
        
        {/* Table Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <button 
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs"
            >
              {paginatedList.length > 0 && paginatedList.every(f => selectedIds.includes(f.id)) ? "Deselect Page" : "Select Page"}
            </button>

            {selectedIds.length > 0 && (
              <>
                <button
                  onClick={() => handleBatchApplyTemplate(false)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Fills Subject and Body template placeholders locally for checked rows"
                >
                  Apply Template ({selectedIds.length})
                </button>

                <button
                  disabled={isAiPersonalizing}
                  onClick={async () => {
                    if (selectedIds.length === 0) return;
                    setIsAiPersonalizing(true);
                    setAiProgress({ current: 0, total: selectedIds.length });
                    const listCopy = [...founders];
                    let done = 0;
                    for (const id of selectedIds) {
                      const founder = listCopy.find(f => f.id === id);
                      if (!founder) { done++; continue; }
                      setAiProgress(p => ({ ...p, current: done + 1 }));
                      try {
                        const res = await fetch("/api/generate-pitch", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            founderName: founder.name,
                            companyName: founder.company,
                            sector: founder.sector,
                            context: founder.context,
                            bio: profile?.bio,
                            tone: aiTone,
                            senderName: profile?.name || "Suraj",
                            experience: profile?.experience,
                            additionalContext: profile?.additionalContext,
                          }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          const docRef = doc(db, "founders", id);
                          await updateDoc(docRef, {
                            personalizedSubject: data.subject || "",
                            personalizedEmail: data.body || "",
                            status: "Generated",
                            updatedAt: new Date().toISOString()
                          });
                          const idx = listCopy.findIndex(f => f.id === id);
                          if (idx !== -1) listCopy[idx] = { ...listCopy[idx], personalizedSubject: data.subject, personalizedEmail: data.body, status: "Generated", updatedAt: new Date().toISOString() };
                        }
                      } catch (e) {
                        console.error("AI pitch failed for", founder.name, e);
                      }
                      done++;
                    }
                    setFounders(listCopy);
                    setIsAiPersonalizing(false);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  title="Generate fully personalized emails for selected leads using Gemini AI"
                >
                  {isAiPersonalizing ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating {aiProgress.current}/{aiProgress.total}...</>
                  ) : (
                    <><Zap className="w-3.5 h-3.5" /> AI Personalize ({selectedIds.length})</>
                  )}
                </button>

                <select
                  value={aiTone}
                  onChange={e => setAiTone(e.target.value)}
                  className="text-[10px] bg-white border border-slate-200 px-2 py-1.5 rounded-xl font-bold cursor-pointer text-slate-600 shadow-3xs"
                  title="Tone for Gemini AI generation"
                >
                  <option>Authentic &amp; Deep Connection</option>
                  <option>Value &amp; Product Audit Focused</option>
                  <option>Edtech Resilience Connection</option>
                  <option>Short, Bulleted &amp; High-Impact</option>
                </select>

                <button
                  onClick={handleBatchShootSelectedAPI}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                  title="Send emails to selected leads in bulk using connected Gmail API"
                >
                  <Send className="w-3.5 h-3.5" />
                  Shoot Selected ({selectedIds.length})
                </button>

                <button
                  onClick={handleBatchDeleteSelected}
                  className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Delete Checked ({selectedIds.length})
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto">
            <button
              onClick={() => setIsQuickPasteOpen(!isQuickPasteOpen)}
              className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-3xs"
            >
              <Plus className="w-4 h-4" />
              Import CSV list
            </button>

            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add target
            </button>
          </div>
        </div>

        {/* Collapsible CSV zone */}
        {isQuickPasteOpen && (
          <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                Import CSV Leads List
              </h3>
              <button 
                onClick={() => setIsQuickPasteOpen(false)}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase cursor-pointer"
              >
                Hide
              </button>
            </div>

            {/* File Upload + Paste instructions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs">
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                Upload CSV File
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setBulkCsvInput(ev.target?.result as string || "");
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="text-[10px] text-slate-400 self-center">or paste CSV data directly below</p>
            </div>

            <p className="text-[11px] text-indigo-900/80 leading-relaxed text-left font-medium">
              Supported columns: <code>Name, Email, Company, Sector, Context</code>. Any extra columns become custom tags (e.g. <code>MutualFriend</code>).
            </p>
            <textarea
              value={bulkCsvInput}
              onChange={(e) => setBulkCsvInput(e.target.value)}
              rows={4}
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-400"
              placeholder={"Name, Email, Company, Sector, MutualFriend\nSurya, surya@admitkard.com, AdmitKard, EdTech, Piyush\nPratik, pratik@codesquad.co, CodeSquad, Tech, Amit"}
            />
            <div className="flex justify-end gap-2 items-center">
              <div className="flex items-center gap-1.5 mr-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Initial Status:</span>
                <select
                  value={csvImportStatus}
                  onChange={(e) => setCsvImportStatus(e.target.value as Founder["status"])}
                  className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-md font-bold cursor-pointer"
                >
                  <option value="Draft">Draft</option>
                  <option value="Generated">Generated</option>
                  <option value="Sent">Sent</option>
                  <option value="Replied">Replied</option>
                </select>
              </div>

              <button
                onClick={handleBulkCsvImport}
                disabled={isCsvImporting || !bulkCsvInput.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                {isCsvImporting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Import Prospects</span>
              </button>
            </div>
          </div>
        )}


        {/* Filter controls */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
            <div className="relative md:col-span-6">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads by name, company, sector..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400 bg-slate-50/50"
              />
            </div>

            <div className="md:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none bg-slate-50/50 cursor-pointer"
              >
                <option value="All">All Tracking Statuses</option>
                <option value="Draft">Draft 📝</option>
                <option value="Generated">Generated ✨</option>
                <option value="Sent">Sent 📤</option>
                <option value="Replied">Replied 🟢</option>
                <option value="Failed">Failed/Bounced 🔴</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none bg-slate-50/50 cursor-pointer"
              >
                <option value="All">All Sectors</option>
                {uniqueSectors.map((sector) => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Directory Table List */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">
                    <button 
                      onClick={handleToggleSelectAll}
                      className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    >
                      {paginatedList.length > 0 && paginatedList.every(f => selectedIds.includes(f.id)) ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4 w-52">Founder / Company</th>
                  <th className="py-3 px-4 w-48">Contact Email</th>
                  <th className="py-3 px-4 w-36 text-center">Outreach Status</th>
                  <th className="py-3 px-4 w-52 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                      <p className="font-semibold text-xs">Synchronizing directory database...</p>
                    </td>
                  </tr>
                ) : paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold">
                      No prospects match filters.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((founder) => {
                    const isChecked = selectedIds.includes(founder.id);
                    const resolved = resolveTemplate(templateSubject, templateBody, founder);
                    const hasManualGenerated = !!founder.personalizedEmail;
                    const isExpanded = expandedFounderId === founder.id;

                    return (
                      <React.Fragment key={founder.id}>
                        <tr 
                          className={`hover:bg-slate-50/50 transition-colors ${isChecked ? "bg-indigo-50/10" : ""} ${isExpanded ? "bg-indigo-50/5" : ""}`}
                        >
                          
                          {/* Selection Checkbox */}
                          <td className="py-4 px-4 text-center">
                            <button 
                              onClick={() => handleToggleSelectRow(founder.id)}
                              className="text-slate-400 hover:text-indigo-600 focus:outline-none cursor-pointer"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Founder Details */}
                          <td className="py-4 px-4">
                            <div className="text-left">
                              <p className="font-extrabold text-slate-900">{founder.name}</p>
                              <p className="text-[10px] text-slate-500 font-bold mt-0.5">{founder.company}</p>
                              <span className="inline-block mt-1 px-1.5 py-0.5 bg-slate-100 border border-slate-200/50 text-[9px] font-bold rounded text-slate-600">
                                {founder.sector}
                              </span>
                            </div>
                          </td>

                          {/* Contact Email */}
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1 text-left">
                              <span className="font-mono text-[11px] select-all bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-100 block w-fit">
                                {founder.email}
                              </span>
                            </div>
                          </td>

                          {/* Outbox status */}
                          <td className="py-4 px-4 text-center">
                            <select
                              value={founder.status}
                              onChange={(e) => handleUpdateStatus(founder.id, e.target.value as Founder["status"])}
                              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-extrabold cursor-pointer"
                            >
                              <option value="Draft">Draft</option>
                              <option value="Generated">Generated</option>
                              <option value="Sent">Sent</option>
                              <option value="Replied">Replied</option>
                              <option value="Failed">Failed</option>
                            </select>
                          </td>

                          {/* Action Items */}
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSendGmailInstantly(founder)}
                                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                                title={gmailAccessToken ? "Send directly via connected Gmail API" : "Simulate Gmail Send"}
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>

                              <a
                                href={`mailto:${founder.email}?subject=${encodeURIComponent(founder.personalizedSubject || resolved.subject)}&body=${encodeURIComponent(founder.personalizedEmail || resolved.body)}`}
                                onClick={() => handleUpdateStatus(founder.id, "Sent")}
                                className="p-1.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                                title="Open default email application (mailto)"
                              >
                                <Mail className="w-3.5 h-3.5 text-slate-500" />
                              </a>

                              <button
                                onClick={() => handleCopyPitch(founder, resolved.subject, resolved.body)}
                                className="p-1.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="Copy Pitch to Clipboard"
                              >
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                              </button>

                              <button
                                onClick={() => handleToggleExpandRow(founder.id)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  isExpanded 
                                    ? "bg-slate-900 text-white border-slate-900" 
                                    : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                                }`}
                                title="Toggle Pitch Preview Panel"
                              >
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                              </button>

                              <button
                                onClick={() => handleDeleteFounder(founder.id)}
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 rounded-lg transition-colors cursor-pointer"
                                title="Delete Target"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>

                        {/* Expandable Preview */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="bg-indigo-50/10 p-5 border-t border-slate-100">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start text-left">
                                <div>
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Live Resolving Template Pitch</h4>
                                  <div className="bg-white border border-slate-200/80 rounded-xl p-4.5 space-y-3.5 shadow-3xs max-h-[300px] overflow-y-auto">
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject Line</p>
                                      <p className="text-xs font-black text-slate-800 mt-0.5">{resolved.subject}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email Body</p>
                                      <div className="text-xs text-slate-600 leading-relaxed font-medium font-sans whitespace-pre-line">
                                        {renderEmailBody(resolved.body)}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Saved Personalization (Firestore)</h4>
                                  {hasManualGenerated ? (
                                    <div className="bg-emerald-50/30 border border-emerald-100/60 rounded-xl p-4.5 space-y-3.5 shadow-3xs max-h-[300px] overflow-y-auto">
                                      <div>
                                        <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Subject Line</p>
                                        <p className="text-xs font-black text-slate-800 mt-0.5">{founder.personalizedSubject}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-0.5">Email Body</p>
                                        <div className="text-xs text-slate-600 leading-relaxed font-medium font-sans whitespace-pre-line">
                                          {renderEmailBody(founder.personalizedEmail || "")}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center bg-white space-y-2">
                                      <Sparkles className="w-6 h-6 text-slate-300 mx-auto" />
                                      <p className="text-xs font-bold text-slate-500">No customized copy generated yet.</p>
                                      <button 
                                        onClick={() => handleBatchApplyTemplate(false)}
                                        className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-wide cursor-pointer"
                                      >
                                        Save resolved template as personalized copy
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-4 text-xs font-bold text-slate-500 select-none">
              <span>Showing {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, totalRows)} of {totalRows} targets</span>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {(() => {
                  const pages: (number | string)[] = [];
                  const delta = 1;
                  const range: number[] = [];

                  for (let i = 1; i <= totalPages; i++) {
                    if (
                      i === 1 ||
                      i === totalPages ||
                      (i >= currentPage - delta && i <= currentPage + delta)
                    ) {
                      range.push(i);
                    }
                  }

                  let l: number | undefined;
                  for (const i of range) {
                    if (l !== undefined) {
                      if (i - l === 2) {
                        pages.push(l + 1);
                      } else if (i - l !== 1) {
                        pages.push("...");
                      }
                    }
                    pages.push(i);
                    l = i;
                  }

                  return pages.map((page, idx) => {
                    if (page === "...") {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-1 text-slate-400">
                          ...
                        </span>
                      );
                    }
                    const isCurrent = page === currentPage;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page as number)}
                        className={`w-7 h-7 rounded-lg border text-center transition-all cursor-pointer ${
                          isCurrent 
                            ? "bg-slate-900 border-slate-900 text-white font-extrabold" 
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  });
                })()}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

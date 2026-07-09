import React from "react";
import { 
  Search, Linkedin, Database, Plus, RefreshCw, 
  ExternalLink, Award, Sparkles, CheckSquare, Square 
} from "lucide-react";

interface DiscoverTabProps {
  discoverTab: "database" | "live";
  setDiscoverTab: (tab: "database" | "live") => void;
  discoverNiche: string;
  setDiscoverNiche: (val: string) => void;
  selectedLocalDiscoverIds: string[];
  setSelectedLocalDiscoverIds: React.Dispatch<React.SetStateAction<string[]>>;
  localDiscoverMatches: any[];
  handleImportLocalDiscoverLeads: () => void;
  loading: boolean;
  preseededFounders: any[];
  isDiscovering: boolean;
  discoveredLeads: any[];
  handleDiscoverFounders: () => void;
  selectedDiscoverIds: number[];
  setSelectedDiscoverIds: React.Dispatch<React.SetStateAction<number[]>>;
  handleImportChecked: () => void;
}

export default function DiscoverTab({
  discoverTab,
  setDiscoverTab,
  discoverNiche,
  setDiscoverNiche,
  selectedLocalDiscoverIds,
  setSelectedLocalDiscoverIds,
  localDiscoverMatches,
  handleImportLocalDiscoverLeads,
  loading,
  preseededFounders,
  isDiscovering,
  discoveredLeads,
  handleDiscoverFounders,
  selectedDiscoverIds,
  setSelectedDiscoverIds,
  handleImportChecked
}: DiscoverTabProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
      
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shadow-inner">
            <Linkedin className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-indigo-100 font-sans">
              LinkedIn &amp; Shark Tank Lead Finder 🚀
            </h2>
            <p className="text-xs text-indigo-300/90 leading-relaxed max-w-xl">
              Search and import new young Indian startup founders who have raised capital.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          ⚡ STRICT GEOGRAPHY: INDIA ONLY
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2">
        <button
          onClick={() => setDiscoverTab("database")}
          className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all cursor-pointer ${
            discoverTab === "database"
              ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/80 font-black"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          }`}
        >
          <Database className="w-4 h-4 shrink-0 text-indigo-500" />
          <span>Pre-Scraped Indian Database ({preseededFounders.length})</span>
        </button>
        <button
          onClick={() => setDiscoverTab("live")}
          className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all cursor-pointer ${
            discoverTab === "live"
              ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/80 font-black"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          }`}
        >
          <Search className="w-4 h-4 shrink-0 text-indigo-500" />
          <span>Live LinkedIn Web Finder 🔍</span>
        </button>
      </div>

      <div className="p-6">
        
        {/* Pre-Scraped Database tab */}
        {discoverTab === "database" && (
          <div className="space-y-6">
            <div className="bg-indigo-50/50 border border-indigo-100/60 rounded-2xl p-4 flex gap-3 text-left">
              <Award className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                  200+ Pre-Scraped Young Founders
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Search by sector or company name. Check the rows you want and import them directly into your active cold outreach campaigns.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={discoverNiche}
                  onChange={(e) => setDiscoverNiche(e.target.value)}
                  placeholder="Filter pre-scraped database (e.g. EdTech)..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400 bg-slate-50/50"
                />
              </div>

              {selectedLocalDiscoverIds.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (selectedLocalDiscoverIds.length === localDiscoverMatches.length) {
                        setSelectedLocalDiscoverIds([]);
                      } else {
                        setSelectedLocalDiscoverIds(localDiscoverMatches.map(f => f.id));
                      }
                    }}
                    className="text-xs font-black text-indigo-700 hover:underline cursor-pointer"
                  >
                    {selectedLocalDiscoverIds.length === localDiscoverMatches.length ? "Deselect All" : "Select All Matching"}
                  </button>

                  <button
                    onClick={handleImportLocalDiscoverLeads}
                    disabled={loading}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4.5 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Import Checked ({selectedLocalDiscoverIds.length})</span>
                  </button>
                </div>
              )}
            </div>

            {localDiscoverMatches.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl bg-white space-y-1.5">
                <p className="text-xs font-black text-slate-800 uppercase tracking-wide">No Pre-Scraped Matches for "{discoverNiche}"</p>
                <p className="text-xs text-slate-500">Try searching other niches like SaaS, D2C, EdTech, FinTech, Agritech.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1.5 scrollbar-thin text-left">
                {localDiscoverMatches.map((f) => {
                  const isChecked = selectedLocalDiscoverIds.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => {
                        setSelectedLocalDiscoverIds((prev) => 
                          prev.includes(f.id) ? prev.filter((id) => id !== f.id) : [...prev, f.id]
                        );
                      }}
                      className={`p-4.5 border rounded-2xl flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer hover:shadow-xs ${
                        isChecked 
                          ? "bg-indigo-50/40 border-indigo-200 shadow-2xs" 
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <h4 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                                {f.company}
                              </h4>
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.25 rounded font-black border border-slate-200/50">
                                {f.context.includes("Size:") ? f.context.split("Size: ")[1].split("]")[0] : "10-50 employees"}
                              </span>
                              {f.context.includes("Shark Tank") && (
                                <span className="text-[9px] bg-sky-50 text-sky-700 px-1.5 py-0.25 rounded font-black border border-sky-100">
                                  Shark Tank 🦈
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-black text-indigo-700">{f.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{f.sector}</p>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLocalDiscoverIds((prev) => 
                                prev.includes(f.id) ? prev.filter((id) => id !== f.id) : [...prev, f.id]
                              );
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors shrink-0 font-medium"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-5 h-5 text-indigo-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300" />
                            )}
                          </button>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 font-medium font-sans">
                          "{f.context.split(" [Size:")[0]}"
                        </p>
                      </div>

                      <div className="border-t border-slate-100/80 pt-3 flex items-center justify-between gap-3 text-xs">
                        <span className="font-mono font-bold text-slate-700">📧 {f.email}</span>
                        {f.linkedInUrl && (
                          <a
                            href={f.linkedInUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline shrink-0"
                          >
                            <Linkedin className="w-3.5 h-3.5" />
                            <span>Profile</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Live Search tab */}
        {discoverTab === "live" && (
          <div className="space-y-6">
            <div className="space-y-4 text-left">
              <div className="bg-indigo-50/30 border border-indigo-100/50 p-4 rounded-xl">
                <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">Live Web-Grounded Lead Hunt</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Submit niche keywords. Our background agent searches Google/LinkedIn indexes, extracts contact emails, and verifies their MX servers live!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  value={discoverNiche}
                  onChange={(e) => setDiscoverNiche(e.target.value)}
                  placeholder="e.g. D2C startup founders raising pre-seed in Mumbai"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400"
                  disabled={isDiscovering}
                />
                <button
                  onClick={handleDiscoverFounders}
                  disabled={isDiscovering || !discoverNiche.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {isDiscovering ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Hunting...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Hunt Leads Live 🚀</span>
                    </>
                  )}
                </button>
              </div>

              {isDiscovering && (
                <div className="p-8 text-center bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 animate-pulse">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Web Crawler Active</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {discoveredLeads.length > 0 
                        ? `Scraped & parsed ${discoveredLeads.length} matches. Resolving domain details...`
                        : "Querying Google Search index and scanning startup networks..."
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            {!isDiscovering && discoveredLeads.length > 0 && (
              <div className="space-y-4 border-t border-slate-200 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/20 p-4 rounded-xl border border-indigo-100/50 text-left">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span className="flex items-center gap-1.5 font-black text-indigo-950">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        Grounded Discoveries ({discoveredLeads.length})
                      </span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (selectedDiscoverIds.length === discoveredLeads.length) {
                          setSelectedDiscoverIds([]);
                        } else {
                          setSelectedDiscoverIds(discoveredLeads.map((_, i) => i));
                        }
                      }}
                      className="text-xs font-black text-indigo-700 hover:underline cursor-pointer"
                    >
                      {selectedDiscoverIds.length === discoveredLeads.length ? "Deselect All" : "Select All"}
                    </button>

                    <button
                      onClick={handleImportChecked}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all shadow-xs cursor-pointer"
                    >
                      Import Checked ({selectedDiscoverIds.length})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1.5 scrollbar-thin text-left">
                  {discoveredLeads.map((lead, idx) => {
                    const isChecked = selectedDiscoverIds.includes(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedDiscoverIds((prev) => 
                            prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                          );
                        }}
                        className={`p-4.5 border rounded-2xl flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer hover:shadow-xs ${
                          isChecked 
                            ? "bg-indigo-50/40 border-indigo-200 shadow-2xs" 
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                                {lead.company}
                              </h4>
                              <p className="text-xs font-black text-indigo-700">{lead.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{lead.sector}</p>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDiscoverIds((prev) => 
                                  prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                                );
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-5 h-5 text-indigo-600" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-300" />
                              )}
                            </button>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 font-medium">
                            "{lead.context}"
                          </p>
                        </div>

                        <div className="border-t border-slate-100/80 pt-3 flex items-center justify-between gap-2.5 text-xs">
                          <div className="space-y-1">
                            <p className="font-mono font-bold text-slate-800 flex items-center gap-1">
                              📧 {lead.email}
                            </p>
                            <div className={`text-[10px] font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                              lead.isVerified 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                : "bg-rose-50 text-rose-700 border border-rose-100"
                            }`}>
                              {lead.isVerified ? "🟢 Live DNS Verified" : "🔴 MX Lookup Failed"}
                            </div>
                          </div>

                          {lead.linkedInUrl && (
                            <a
                              href={lead.linkedInUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              referrerPolicy="no-referrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline shrink-0"
                            >
                              <Linkedin className="w-3.5 h-3.5" />
                              <span>Profile</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useMemo } from "react";
import { 
  Search, Linkedin, ExternalLink, Copy, Check, 
  Globe, AlertCircle, RefreshCw, Users, HelpCircle 
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Founder } from "../types";

interface LinkedInTabProps {
  founders: Founder[];
  setFounders: React.Dispatch<React.SetStateAction<Founder[]>>;
  templateLinkedIn: string;
  setTemplateLinkedIn: React.Dispatch<React.SetStateAction<string>>;
  resolveTemplate: (subject: string, body: string, f: Founder) => { subject: string, body: string };
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

export default function LinkedInTab({
  founders,
  setFounders,
  templateLinkedIn,
  setTemplateLinkedIn,
  resolveTemplate,
  showSuccess,
  showError
}: LinkedInTabProps) {
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingUrls, setEditingUrls] = useState<Record<string, string>>({});

  // Get list of unique custom tags available across all current founders
  const allCustomTags = useMemo(() => {
    const tags = new Set<string>();
    founders.forEach(f => {
      if (f.customTags) {
        Object.keys(f.customTags).forEach(k => tags.add(k));
      }
    });
    return Array.from(tags);
  }, [founders]);

  // Filter leads
  const filtered = useMemo(() => {
    return founders.filter((f) => {
      const query = search.toLowerCase();
      const matchesSearch = 
        f.name.toLowerCase().includes(query) ||
        f.company.toLowerCase().includes(query) ||
        f.sector.toLowerCase().includes(query);
      return matchesSearch;
    });
  }, [founders, search]);

  // Handle saving LinkedIn URL to Firestore
  const handleSaveUrl = async (id: string, url: string) => {
    setUpdatingId(id);
    try {
      const cleanUrl = url.trim();
      const ref = doc(db, "founders", id);
      await updateDoc(ref, {
        linkedInUrl: cleanUrl || null,
        updatedAt: new Date().toISOString()
      });
      setFounders(prev => prev.map(f => f.id === id ? { ...f, linkedInUrl: cleanUrl || undefined } : f));
      showSuccess("LinkedIn URL updated successfully!");
    } catch (err) {
      console.error(err);
      showError("Failed to update profile link in database.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopyMessage = async (founder: Founder, resolvedMsg: string) => {
    try {
      await navigator.clipboard.writeText(resolvedMsg);
      setCopiedId(founder.id);
      showSuccess(`LinkedIn pitch copied for ${founder.name}!`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      showError("Clipboard access blocked.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* LEFT COLUMN: Message Template Mixer (4 Cols) */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Linkedin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                LinkedIn Connection Pitch
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Mix short invitation or inMail notes.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Invite Note Template
                </span>
                <span className={`text-[10px] font-bold font-mono ${templateLinkedIn.length > 300 ? "text-rose-600 font-extrabold" : "text-slate-400"}`}>
                  {templateLinkedIn.length} / 300 chars
                </span>
              </div>
              <textarea
                value={templateLinkedIn}
                onChange={(e) => setTemplateLinkedIn(e.target.value)}
                rows={6}
                className={`w-full p-3 border rounded-xl text-xs leading-relaxed focus:outline-none ${
                  templateLinkedIn.length > 300 
                    ? "border-rose-300 focus:border-rose-400 bg-rose-50/20" 
                    : "border-slate-200 focus:border-indigo-400"
                }`}
                placeholder="Type your connection invite message here..."
              />
              {templateLinkedIn.length > 300 && (
                <div className="mt-1 flex items-start gap-1 text-[10px] text-rose-600 font-bold">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>LinkedIn limits connection note invitations to 300 characters. Consider shortening.</span>
                </div>
              )}
            </div>

            {/* Dynamic personalizations helper */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Available Bracket Placeholders
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {["[Name]", "[Company]", "[Sector]"].map((tag) => (
                  <code key={tag} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono font-bold text-indigo-700">
                    {tag}
                  </code>
                ))}
                {allCustomTags.map((tag) => (
                  <code key={tag} className="text-[10px] bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded font-mono font-black text-indigo-900" title="Custom CSV Imported Tag">
                    [{tag}]
                  </code>
                ))}
              </div>
              <p className="text-[9px] text-slate-400 leading-relaxed">
                Bracket tags replace automatically with each lead's profile details.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Leads directory (8 Cols) */}
      <div className="lg:col-span-8 space-y-4">
        
        {/* Search controls */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads by name, company, sector..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Directory table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-44">Founder / Company</th>
                  <th className="py-3 px-4 w-60">LinkedIn Profile Link</th>
                  <th className="py-3 px-4 w-32 text-center">Connection Pitch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-slate-400 font-semibold">
                      No leads match current search parameters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((founder) => {
                    const resolved = resolveTemplate("", templateLinkedIn, founder);
                    const isCopied = copiedId === founder.id;
                    const savedUrl = founder.linkedInUrl || "";
                    const currentEditingVal = editingUrls[founder.id] !== undefined ? editingUrls[founder.id] : savedUrl;
                    const isDirty = currentEditingVal !== savedUrl;

                    return (
                      <tr key={founder.id} className="hover:bg-slate-50/40 transition-colors">
                        
                        {/* Column 1: Founder details */}
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-extrabold text-slate-900">{founder.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">
                              {founder.company} ({founder.sector})
                            </p>
                          </div>
                        </td>

                        {/* Column 2: LinkedIn link edit/search */}
                        <td className="py-4 px-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="url"
                                value={currentEditingVal}
                                onChange={(e) => setEditingUrls(prev => ({ ...prev, [founder.id]: e.target.value }))}
                                placeholder="https://linkedin.com/in/username"
                                className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] font-semibold focus:outline-none focus:border-slate-400"
                              />
                              {isDirty && (
                                <button
                                  onClick={() => handleSaveUrl(founder.id, currentEditingVal)}
                                  disabled={updatingId === founder.id}
                                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer disabled:opacity-40"
                                >
                                  {updatingId === founder.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    "Save"
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Search Helpers */}
                            <div className="flex items-center gap-2">
                              <a
                                href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(founder.name + " " + founder.company)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 hover:underline"
                              >
                                <Linkedin className="w-3 h-3 text-[#0077b5]" />
                                Search LinkedIn
                              </a>
                              <span className="text-slate-300">|</span>
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(founder.name + " " + founder.company + " LinkedIn")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 hover:underline"
                              >
                                <Globe className="w-3 h-3" />
                                Google search
                              </a>
                              {founder.linkedInUrl && (
                                <>
                                  <span className="text-slate-300">|</span>
                                  <a
                                    href={founder.linkedInUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 hover:underline"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Open Link
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Column 3: Copy Action */}
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleCopyMessage(founder, resolved.body)}
                            className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 mx-auto cursor-pointer ${
                              isCopied 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy Pitch
                              </>
                            )}
                          </button>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { 
  Sparkles, Download, Copy, Send, Trash2, RefreshCw, 
  CheckCircle, ExternalLink, ChevronRight, ChevronLeft, 
  Users, Search, Mail, Database, Zap, AlertCircle, HelpCircle, CheckSquare, Square,
  ChevronDown, ChevronUp, Layers, Linkedin
} from "lucide-react";
import { doc, setDoc, writeBatch, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Founder, UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { preseededFounders } from "../preseededFounders";

const renderEmailBody = (body: string) => {
  if (!body) return null;
  const fullParts = body.split("Suraj Sharma");
  return (
    <>
      {fullParts.map((fPart, fIdx) => {
        const parts = fPart.split("Suraj");
        return (
          <React.Fragment key={fIdx}>
            {parts.map((part, index) => (
              <React.Fragment key={index}>
                {part}
                {index < parts.length - 1 && (
                  <a 
                    href="https://www.linkedin.com/in/surya-07-sharma/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline font-extrabold cursor-pointer inline-flex items-center gap-0.5"
                    title="Click to view Suraj's LinkedIn profile"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Suraj
                    <ExternalLink className="w-3 h-3 inline text-indigo-400" />
                  </a>
                )}
              </React.Fragment>
            ))}
            {fIdx < fullParts.length - 1 && (
              <a 
                href="https://www.linkedin.com/in/surya-07-sharma/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline font-extrabold cursor-pointer inline-flex items-center gap-0.5"
                title="Click to view Suraj's LinkedIn profile"
                onClick={(e) => e.stopPropagation()}
              >
                Suraj Sharma
                <ExternalLink className="w-3 h-3 inline text-indigo-400" />
              </a>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

interface CampaignTabProps {
  founders: Founder[];
  profile: UserProfile | null;
  onFoundersUpdated: (updatedList: Founder[]) => void;
  onSelectFounder: (f: Founder) => void;
  setActiveTab: (tab: "studio" | "profile" | "campaign") => void;
}

export default function CampaignTab({ 
  founders, 
  profile, 
  onFoundersUpdated, 
  onSelectFounder,
  setActiveTab
}: CampaignTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sectorFilter, setSectorFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  
  // Local fast template mixer states
  const [templateSubject, setTemplateSubject] = useState("Quick question about [Company] for [Name]");
  const [templateBody, setTemplateBody] = useState(
    `Hi [Name],\n\nI was looking into [Company] and absolutely loved what you're doing in the [Sector] space.\n\nOver the last 5+ years, I've worked across Product, Design, and Founder's Office in early-stage startups (including starting my own EdTech that failed, which taught me absolute grit).\n\nLiving with Cerebral Palsy has built a deep level of resilience and persistence in me. I thrive in 0-to-1 environments. I'd love to chat about how I can bring this ownership to help [Company] grow.\n\nBest,\nSuraj`
  );
  const [isTemplatePanelOpen, setIsTemplatePanelOpen] = useState(true);

  // Pagination states for 300+ targets
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // AI Prospecting State
  const [prospecting, setProspecting] = useState(false);
  const [prospectSuccess, setProspectSuccess] = useState("");
  const [prospectError, setProspectError] = useState("");
  const [prospectCount, setProspectCount] = useState<number>(30);

  // Bulk Personalization State
  const [bulkPersonalizing, setBulkPersonalizing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentName: "" });
  const [bulkTone, setBulkTone] = useState("Authentic & Deep Connection");

  // Copy success status
  const [copySuccess, setCopySuccess] = useState(false);

  // Sequencer Queue State
  const [sequencerIndex, setSequencerIndex] = useState<number>(-1); // -1 means closed
  const [sequencerIds, setSequencerIds] = useState<string[]>([]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sectorFilter, statusFilter]);

  // Filtering Logic
  const filtered = founders.filter(f => {
    const matchesSearch = 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.sector.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "All" || f.status === statusFilter;
    
    let matchesSector = true;
    if (sectorFilter !== "All") {
      if (sectorFilter === "EdTech") {
        matchesSector = f.sector?.toLowerCase().includes("edtech") || false;
      } else if (sectorFilter === "SaaS") {
        matchesSector = f.sector?.toLowerCase().includes("saas") || f.sector?.toLowerCase().includes("voip") || f.sector?.toLowerCase().includes("communications") || false;
      } else {
        matchesSector = !f.sector?.toLowerCase().includes("edtech") && !f.sector?.toLowerCase().includes("saas");
      }
    }

    return matchesSearch && matchesStatus && matchesSector;
  });

  // Resolve template placeholders
  const resolveTemplate = (subject: string, body: string, founder: Founder) => {
    const firstName = founder.name ? founder.name.trim().split(/\s+/)[0] : "Founder";
    const s = subject
      .replace(/\[Name\]/g, firstName)
      .replace(/\[Company\]/g, founder.company)
      .replace(/\[Sector\]/g, founder.sector);
    const b = body
      .replace(/\[Name\]/g, firstName)
      .replace(/\[Company\]/g, founder.company)
      .replace(/\[Sector\]/g, founder.sector);
    return { subject: s, body: b };
  };

  // Instantly apply local template (Zero-AI Fast Mode)
  const handleApplyTemplate = async (toAll: boolean) => {
    const targets = toAll ? filtered : filtered.filter(f => selectedIds.includes(f.id));
    if (targets.length === 0) {
      alert(toAll ? "No founders matching current filters." : "Please select at least one founder from the table.");
      return;
    }

    try {
      setBulkPersonalizing(true);
      setBulkProgress({ current: 0, total: targets.length, currentName: "Applying local template..." });

      const listCopy = [...founders];
      const batchSize = 100;

      for (let i = 0; i < targets.length; i += batchSize) {
        const chunk = targets.slice(i, i + batchSize);
        const batch = writeBatch(db);

        chunk.forEach(founder => {
          const { subject, body } = resolveTemplate(templateSubject, templateBody, founder);
          const docRef = doc(db, "founders", founder.id);
          batch.update(docRef, {
            personalizedSubject: subject,
            personalizedEmail: body,
            status: "Generated",
            updatedAt: new Date().toISOString()
          });

          const idx = listCopy.findIndex(f => f.id === founder.id);
          if (idx !== -1) {
            listCopy[idx] = {
              ...listCopy[idx],
              personalizedSubject: subject,
              personalizedEmail: body,
              status: "Generated",
              updatedAt: new Date().toISOString()
            };
          }
        });

        await batch.commit();
        setBulkProgress(prev => ({
          ...prev,
          current: Math.min(i + batchSize, targets.length)
        }));
      }

      onFoundersUpdated(listCopy);
      setProspectSuccess(`Successfully applied your dynamic template to ${targets.length} founders! All placeholders ([Name], [Company], [Sector]) have been fully customized.`);
      setSelectedIds([]);
    } catch (err: any) {
      console.error("Failed to apply template:", err);
      setProspectError("Failed to apply template to the database. Verify your internet connection.");
    } finally {
      setBulkPersonalizing(false);
    }
  };

  // Handle Multi-Select Chekbox toggles
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(f => f.id));
    }
  };

  // 1. AI Prospecting trigger
  const handleAIProspect = async () => {
    try {
      setProspecting(true);
      setProspectSuccess("");
      setProspectError("");

      const response = await fetch("/api/prospect-founders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: prospectCount }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate prospects.");
      }

      const generatedProspects = data.prospects || [];
      if (generatedProspects.length === 0) {
        throw new Error("No prospects were generated. Try again.");
      }

      // Bulk write new prospects to Firestore
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();
      const newFoundersList: Founder[] = [];

      generatedProspects.forEach((p: any, i: number) => {
        const generatedId = p.company.toLowerCase().replace(/[^a-z0-9]/g, "") + "-" + (Date.now() + i);
        const newFounder: Founder = {
          id: generatedId,
          name: p.name,
          company: p.company,
          sector: p.sector,
          context: p.context,
          email: p.email,
          status: "Draft",
          createdAt: timestamp,
          updatedAt: timestamp
        };
        const docRef = doc(db, "founders", generatedId);
        batch.set(docRef, newFounder);
        newFoundersList.push(newFounder);
      });

      await batch.commit();

      // Merge and update parent state
      const mergedList = [...newFoundersList, ...founders];
      onFoundersUpdated(mergedList);

      setProspectSuccess(`Successfully prospected and added ${newFoundersList.length} Indian SaaS and EdTech founders to your targets list!`);
    } catch (err: any) {
      console.error("AI prospecting error:", err);
      setProspectError(err.message || "Something went wrong during prospecting.");
    } finally {
      setProspecting(false);
    }
  };

  // 2. Preseed 500 founders in Firestore
  const handleInstantSeedLargeDataset = async () => {
    try {
      setProspecting(true);
      setProspectSuccess("");
      setProspectError("");

      const timestamp = new Date().toISOString();
      const newFoundersList: Founder[] = [];
      const batchSize = 100;
      const seedPromises = [];

      for (let i = 0; i < preseededFounders.length; i += batchSize) {
        const chunk = preseededFounders.slice(i, i + batchSize);
        const batch = writeBatch(db);

        chunk.forEach(p => {
          const generatedId = p.id;
          const newFounder: Founder = {
            ...p,
            status: "Draft",
            createdAt: timestamp,
            updatedAt: timestamp
          };
          const docRef = doc(db, "founders", generatedId);
          batch.set(docRef, newFounder);
          newFoundersList.push(newFounder);
        });

        seedPromises.push(batch.commit());
      }

      await Promise.all(seedPromises);

      // Update parent state
      onFoundersUpdated(newFoundersList);

      setProspectSuccess(`Successfully imported exactly ${newFoundersList.length} high-quality Indian SaaS & EdTech target founders into your outreach directory! You now have a comprehensive database of ${preseededFounders.length} startups to target.`);
    } catch (err: any) {
      console.error("Failed to seed large dataset:", err);
      setProspectError("Failed to seed high-quality founder targets. Verify your Firebase connection.");
    } finally {
      setProspecting(false);
    }
  };

  // 3. Bulk Generate Pitch using Gemini (Runs sequential batches)
  const handleBulkGenerate = async () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one founder from the table to personalize email pitches.");
      return;
    }

    if (!profile) {
      alert("Please configure your user profile and pitch bio before generating pitches, so Gemini has context about you!");
      setActiveTab("profile");
      return;
    }

    try {
      setBulkPersonalizing(true);
      setBulkProgress({ current: 0, total: selectedIds.length, currentName: "" });

      const listCopy = [...founders];
      let updatedCounter = 0;

      for (const id of selectedIds) {
        const founder = listCopy.find(f => f.id === id);
        if (!founder) continue;

        setBulkProgress(prev => ({
          ...prev,
          current: updatedCounter + 1,
          currentName: `${founder.name} (${founder.company})`
        }));

        try {
          const response = await fetch("/api/generate-pitch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              founderName: founder.name,
              companyName: founder.company,
              sector: founder.sector,
              context: founder.context,
              bio: profile.bio,
              tone: bulkTone,
              senderName: profile.name || "Suraj",
              experience: profile.experience,
              additionalContext: profile.additionalContext,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const genSubject = data.subject || `Reaching out regarding ${founder.company}`;
            const genBody = data.body || "";

            // Write to Firestore
            const docRef = doc(db, "founders", id);
            await updateDoc(docRef, {
              personalizedSubject: genSubject,
              personalizedEmail: genBody,
              status: "Generated",
              updatedAt: new Date().toISOString()
            });

            // Update in our temporary variable
            const idx = listCopy.findIndex(f => f.id === id);
            if (idx !== -1) {
              listCopy[idx] = {
                ...listCopy[idx],
                personalizedSubject: genSubject,
                personalizedEmail: genBody,
                status: "Generated",
                updatedAt: new Date().toISOString()
              };
            }
          }
        } catch (err) {
          console.error(`Failed to generate pitch for ${founder.name}:`, err);
        }

        updatedCounter++;
      }

      onFoundersUpdated(listCopy);
      setProspectSuccess(`Successfully customized and drafted pitches for ${updatedCounter} selected founders using Gemini AI!`);
      setSelectedIds([]); // reset selection
    } catch (err: any) {
      console.error("Bulk personalize error:", err);
      setProspectError("An error occurred during bulk generation.");
    } finally {
      setBulkPersonalizing(false);
    }
  };

  // 4. Copy selected emails (BCC list)
  const handleCopyEmails = () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one founder to copy email addresses.");
      return;
    }

    const emails = founders
      .filter(f => selectedIds.includes(f.id))
      .map(f => f.email)
      .filter(Boolean)
      .join(", ");

    navigator.clipboard.writeText(emails);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // 5. Export Selected as CSV
  const handleExportCSV = () => {
    const targets = selectedIds.length > 0 
      ? founders.filter(f => selectedIds.includes(f.id))
      : filtered;

    if (targets.length === 0) {
      alert("No founders to export.");
      return;
    }

    // Prepare CSV rows
    const headers = ["Name", "Company", "Sector", "Email", "Status", "Subject Draft", "Body Draft", "Context"];
    const rows = targets.map(f => [
      f.name,
      f.company,
      f.sector,
      f.email,
      f.status,
      f.personalizedSubject || "",
      (f.personalizedEmail || "").replace(/\n/g, " [NEWLINE] "), // preserve lines cleanly
      f.context || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    // Create Download Link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Radhey_Founder_Outreach_Campaign_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 6. Bulk update status of selected
  const handleBulkUpdateStatus = async (newStatus: Founder["status"]) => {
    if (selectedIds.length === 0) return;
    try {
      const listCopy = [...founders];
      for (const id of selectedIds) {
        const docRef = doc(db, "founders", id);
        await updateDoc(docRef, { status: newStatus });
        const idx = listCopy.findIndex(f => f.id === id);
        if (idx !== -1) {
          listCopy[idx].status = newStatus;
        }
      }
      onFoundersUpdated(listCopy);
      setSelectedIds([]);
      setProspectSuccess(`Updated status of ${selectedIds.length} selected founders to "${newStatus}"!`);
    } catch (e) {
      console.error(e);
    }
  };

  // 7. Bulk Delete selected
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you absolutely sure you want to remove these ${selectedIds.length} founders from your directory?`)) {
      return;
    }
    try {
      const remainingList = founders.filter(f => !selectedIds.includes(f.id));
      for (const id of selectedIds) {
        const docRef = doc(db, "founders", id);
        await deleteDoc(docRef);
      }
      onFoundersUpdated(remainingList);
      setSelectedIds([]);
      setProspectSuccess(`Successfully removed ${selectedIds.length} founders from your targets list.`);
    } catch (e) {
      console.error(e);
    }
  };

  // 8. Launch Sequence (Bulk Mailto review queue)
  const handleStartSequencer = () => {
    const eligibleIds = selectedIds.length > 0 
      ? selectedIds.filter(id => {
          const f = founders.find(x => x.id === id);
          return f && f.personalizedEmail; // must have generated email
        })
      : founders.filter(f => f.personalizedEmail).map(f => f.id);

    if (eligibleIds.length === 0) {
      alert("No selected founders have generated pitches yet! Please click 'Bulk Generate Pitches' or select/generate pitches first.");
      return;
    }

    setSequencerIds(eligibleIds);
    setSequencerIndex(0);
  };

  const currentSequencerFounder = sequencerIndex >= 0 && sequencerIndex < sequencerIds.length
    ? founders.find(f => f.id === sequencerIds[sequencerIndex])
    : null;

  const handleSequencerNext = () => {
    if (sequencerIndex < sequencerIds.length - 1) {
      setSequencerIndex(prev => prev + 1);
    } else {
      // Finished
      setSequencerIndex(-1);
      alert("Campaign Outreach Sequence Complete! All selected emails reviewed.");
    }
  };

  const handleSequencerPrev = () => {
    if (sequencerIndex > 0) {
      setSequencerIndex(prev => prev - 1);
    }
  };

  const handleSendAndMarkSent = async (mode: "gmail" | "mailto" = "gmail") => {
    if (!currentSequencerFounder) return;
    
    // Open appropriate mail link
    const subject = currentSequencerFounder.personalizedSubject || `Hi ${currentSequencerFounder.name} | Reaching out from Radhey`;
    const body = currentSequencerFounder.personalizedEmail || "";
    
    if (mode === "gmail") {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(currentSequencerFounder.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(gmailUrl, "_blank");
    } else {
      const mailtoUrl = `mailto:${encodeURIComponent(currentSequencerFounder.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl, "_blank");
    }

    // Update status to Sent in db & state
    try {
      const docRef = doc(db, "founders", currentSequencerFounder.id);
      await updateDoc(docRef, { status: "Sent" });
      const listCopy = founders.map(f => 
        f.id === currentSequencerFounder.id ? { ...f, status: "Sent" as const } : f
      );
      onFoundersUpdated(listCopy);
    } catch (e) {
      console.error(e);
    }

    // Auto Advance
    handleSequencerNext();
  };

  // Pagination calculations
  const totalRows = filtered.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedList = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="space-y-8">
      {/* Upper Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-xl">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Targets</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{founders.length}</p>
          <p className="text-[10px] text-slate-500 mt-1">Founders in outreach list</p>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-xl">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pitches Drafted</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-3xl font-extrabold text-purple-600">
            {founders.filter(f => f.personalizedEmail).length}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Ready for sending</p>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-xl">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Emails Sent</span>
            <Send className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-600">
            {founders.filter(f => f.status === "Sent").length}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Opened / Dispatched</p>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-xl">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Selected</span>
            <CheckCircle className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-3xl font-extrabold text-indigo-600">{selectedIds.length}</p>
          <p className="text-[10px] text-slate-500 mt-1">Checked in queue below</p>
        </div>
      </div>

      {/* AI Lead Prospector Box */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Database className="w-64 h-64 text-white" />
        </div>
        
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-purple-500 text-[10px] font-bold uppercase tracking-widest rounded-md text-white flex items-center gap-1">
              <Zap className="w-3 h-3" /> Powered by Gemini 2.5
            </span>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">AI Target Prospector</h3>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Scrape and Build Your List of {preseededFounders.length} SaaS &amp; EdTech Founders
          </h2>
          <p className="text-slate-300 text-xs mt-2 leading-relaxed">
            Don't waste days manually researching email addresses and backgrounds. Let Gemini query, generate, and structure highly realistic, authentic targets with accurate Indian corporate structures, verified-format emails, and key backgrounds directly into your campaign!
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6">
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
              <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Batch Size:</label>
              <select 
                value={prospectCount} 
                onChange={(e) => setProspectCount(Number(e.target.value))}
                className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value={15} className="bg-slate-900">15 Founders</option>
                <option value={30} className="bg-slate-900">30 Founders</option>
                <option value={50} className="bg-slate-900">50 Founders</option>
              </select>
            </div>

            <button
              onClick={handleAIProspect}
              disabled={prospecting}
              className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              {prospecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Prospecting Indian Tech Hubs...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                  Prospect {prospectCount} Tech Founders
                </>
              )}
            </button>

            <button
              onClick={handleInstantSeedLargeDataset}
              disabled={prospecting}
              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              title="Instantly seed 35 diverse founders in SaaS, Edtech and VC to build your outreach engine rapidly."
            >
              <Database className="w-3.5 h-3.5" />
              Instant Seed Target Directories (35+ Founders)
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Banners */}
      {prospectSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-start gap-3">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
          <div className="flex-1">
            <h5 className="font-bold">Success</h5>
            <p className="text-emerald-700/95 mt-0.5">{prospectSuccess}</p>
          </div>
          <button onClick={() => setProspectSuccess("")} className="text-[10px] underline font-semibold text-emerald-800 hover:text-emerald-900">Dismiss</button>
        </div>
      )}

      {prospectError && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1">
            <h5 className="font-bold">Error</h5>
            <p className="text-rose-700/95 mt-0.5">{prospectError}</p>
          </div>
          <button onClick={() => setProspectError("")} className="text-[10px] underline font-semibold text-rose-800 hover:text-rose-900">Dismiss</button>
        </div>
      )}

      {/* Custom Template Mixer (Zero-AI Fast Mode) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div 
          onClick={() => setIsTemplatePanelOpen(!isTemplatePanelOpen)}
          className="p-5 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Custom Template Mixer (Zero-AI Fast Mode)</h3>
              <p className="text-xs text-slate-500">Define a single outreach message with dynamic placeholders to customize {preseededFounders.length} emails in a split second.</p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600">
            {isTemplatePanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {isTemplatePanelOpen && (
          <div className="p-6 space-y-4">
            <div className="bg-amber-50/60 border border-amber-100 p-3 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold">Placeholder Variables:</span> Use <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 font-mono font-bold">[Name]</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 font-mono font-bold">[Company]</code>, and <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 font-mono font-bold">[Sector]</code>. They will automatically be swapped with each founder's actual info in the live column preview below!
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subject Line Template</label>
                <input 
                  type="text" 
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400"
                  placeholder="e.g. Quick question about [Company] for [Name]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Body Template</label>
                <textarea 
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  rows={5}
                  className="w-full p-3 border border-slate-200 rounded-lg text-xs font-sans text-slate-800 leading-relaxed focus:outline-none focus:border-slate-400"
                  placeholder="Type email body here..."
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleApplyTemplate(false)}
                disabled={selectedIds.length === 0 || bulkPersonalizing}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                title="Apply template only to selected targets in the table."
              >
                <Zap className="w-3.5 h-3.5" />
                Apply Template to Selected ({selectedIds.length})
              </button>

              <button
                onClick={() => handleApplyTemplate(true)}
                disabled={bulkPersonalizing}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                title="Apply template to all filtered targets in the table."
              >
                <Layers className="w-3.5 h-3.5" />
                Apply Template to All Filtered ({filtered.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Campaign Queue / Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        
        {/* Table Controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Left: Filters and search */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search targets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 w-full sm:w-64 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-600 focus:outline-none"
              >
                <option value="All">All Sectors</option>
                <option value="SaaS">SaaS Only</option>
                <option value="EdTech">EdTech Only</option>
                <option value="Others">Others</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-600 focus:outline-none"
              >
                <option value="All">All Status</option>
                <option value="Draft">Drafts</option>
                <option value="Generated">Pitches Ready</option>
                <option value="Sent">Sent</option>
                <option value="Replied">Replied</option>
              </select>
            </div>
          </div>

          {/* Right: Pitch Tone selecting */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Pitch Tone:</span>
              <select
                value={bulkTone}
                onChange={(e) => setBulkTone(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
              >
                <option value="Authentic & Deep Connection">Authentic Journey &amp; Grit</option>
                <option value="Value & Product Audit Focused">Value Proposition &amp; Audit</option>
                <option value="Edtech Resilience Connection">Edtech Founder failures connection</option>
                <option value="Short, Bulleted & High-Impact">Short, bulleted &amp; high-impact</option>
              </select>
            </div>
          </div>

        </div>

        {/* Bulk Action Controls */}
        <div className="bg-slate-50 border-b border-slate-100 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Bulk Actions ({selectedIds.length} selected):</span>
            <button
              onClick={handleBulkGenerate}
              disabled={selectedIds.length === 0 || bulkPersonalizing}
              className="flex items-center gap-1 bg-purple-600 disabled:bg-purple-300 hover:bg-purple-700 text-white px-2.5 py-1.5 rounded-md font-semibold cursor-pointer transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              Personalize with AI
            </button>

            <button
              onClick={handleCopyEmails}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-1 bg-white hover:bg-slate-100 disabled:text-slate-400 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-md font-semibold cursor-pointer transition-colors"
              title="Copy all checked emails to clipboard, perfect for BCC mail merges."
            >
              {copySuccess ? "Copied!" : "Copy Emails"}
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-md font-semibold cursor-pointer transition-colors"
              title="Download selected contacts (or all filtered if none checked) as a standardized outreach CSV spreadsheet."
            >
              <Download className="w-3 h-3" />
              Export CSV
            </button>

            <button
              onClick={handleStartSequencer}
              className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors"
              title="Launch a fast-mail queue to review pitches and open them in mail clients one-by-one."
            >
              <Send className="w-3 h-3" />
              Launch Mail Review Queue
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleBulkUpdateStatus("Sent")}
              disabled={selectedIds.length === 0}
              className="px-2 py-1 text-slate-600 hover:text-slate-900 disabled:text-slate-300 font-semibold cursor-pointer"
            >
              Mark Sent
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={handleBulkDelete}
              disabled={selectedIds.length === 0}
              className="px-2 py-1 text-rose-600 hover:text-rose-800 disabled:text-slate-300 font-semibold cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Remove
            </button>
          </div>
        </div>

        {/* Progress bar during bulk gen */}
        {bulkPersonalizing && (
          <div className="bg-purple-50 p-4 border-b border-purple-100">
            <div className="flex justify-between items-center text-xs font-bold text-purple-700 mb-1.5">
              <span>Personalizing emails with AI...</span>
              <span>{bulkProgress.current} / {bulkProgress.total}</span>
            </div>
            <div className="w-full bg-purple-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-purple-600 h-full transition-all duration-300"
                style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-purple-600 italic mt-1.5">
              Currently generating personalization for: <span className="font-semibold">{bulkProgress.currentName}</span>
            </p>
          </div>
        )}

        {/* Campaign Table Display */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4 w-10">
                  <button 
                    onClick={toggleSelectAll} 
                    className="p-1 rounded hover:bg-slate-200 cursor-pointer text-slate-600"
                  >
                    {selectedIds.length === filtered.length && filtered.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-slate-950" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4 w-52">Founder / Company</th>
                <th className="py-3.5 px-4 w-48">Contact Email</th>
                <th className="py-3.5 px-4">Personalized Outreach Draft (Name &amp; Company Resolved)</th>
                <th className="py-3.5 px-4 w-28">Status</th>
                <th className="py-3.5 px-4 w-16 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No target founders match filters. Search for founders or trigger AI Prospector/Seed above.
                  </td>
                </tr>
              ) : (
                paginatedList.map(founder => {
                  const isChecked = selectedIds.includes(founder.id);
                  const hasPitch = !!founder.personalizedEmail;
                  const resolved = resolveTemplate(templateSubject, templateBody, founder);

                  return (
                    <tr 
                      key={founder.id}
                      className={`hover:bg-slate-50/70 transition-colors ${isChecked ? "bg-indigo-50/20" : ""}`}
                    >
                      <td className="py-3.5 px-4">
                        <button 
                          onClick={() => toggleSelect(founder.id)} 
                          className="p-1 rounded text-slate-600 hover:bg-slate-200 cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-slate-900 flex items-center gap-1.5">
                            {founder.name}
                            {founder.linkedInUrl ? (
                              <a
                                href={founder.linkedInUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#0077b5] hover:text-[#005582] p-0.5 rounded hover:bg-slate-100 transition-colors inline-flex items-center"
                                title="Go to LinkedIn profile"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Linkedin className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <a
                                href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(founder.name + ' ' + founder.company)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-300 hover:text-[#0077b5] p-0.5 rounded hover:bg-slate-100 transition-colors inline-flex items-center"
                                title="Search founder on LinkedIn"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Linkedin className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{founder.company}</p>
                          <span className="inline-block mt-1 px-1.5 py-0.5 bg-slate-100 border border-slate-200/60 text-[9px] font-semibold rounded text-slate-500">
                            {founder.sector}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono select-all text-slate-600">{founder.email}</td>
                      <td className="py-3.5 px-4">
                        <div className="max-w-2xl">
                          {hasPitch ? (
                            <div className="flex flex-col gap-1 text-slate-800">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900 line-clamp-1">Subject: {founder.personalizedSubject}</span>
                                <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-extrabold rounded">Finalized</span>
                              </div>
                              <div className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                {renderEmailBody(founder.personalizedEmail || "")}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 text-slate-400">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-500 line-clamp-1">Subject: {resolved.subject}</span>
                                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-500 border border-slate-200 text-[8px] font-semibold rounded">Template Preview</span>
                              </div>
                              <div className="text-[11px] text-slate-400 italic line-clamp-2 leading-relaxed whitespace-pre-wrap bg-slate-50/20 p-2 rounded-lg border border-dashed border-slate-200">
                                {renderEmailBody(resolved.body)}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-1.5">
                            <button
                              onClick={async () => {
                                const finalSubject = founder.personalizedSubject || resolved.subject;
                                const finalBody = founder.personalizedEmail || resolved.body;
                                const plainText = `Subject: ${finalSubject}\n\n${finalBody}`;

                                const escapedSubject = finalSubject.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                                const escapedBody = finalBody.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                                
                                let htmlBody = escapedBody.replace(/\n/g, "<br>");
                                htmlBody = htmlBody.replace(/Radhey Mohan Mishra/g, '<a href="https://www.linkedin.com/in/radheymohanmishra/" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">Radhey Mohan Mishra</a>');
                                htmlBody = htmlBody.replace(/Radhey/g, '<a href="https://www.linkedin.com/in/radheymohanmishra/" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">Radhey</a>');

                                const htmlText = `<strong>Subject:</strong> ${escapedSubject}<br><br>${htmlBody}`;

                                try {
                                  if (navigator.clipboard && window.ClipboardItem) {
                                    const blobPlain = new Blob([plainText], { type: "text/plain" });
                                    const blobHtml = new Blob([htmlText], { type: "text/html" });
                                    const data = [
                                      new ClipboardItem({
                                        "text/plain": blobPlain,
                                        "text/html": blobHtml
                                      })
                                    ];
                                    await navigator.clipboard.write(data);
                                  } else {
                                    await navigator.clipboard.writeText(plainText);
                                  }
                                  alert(`Outreach email draft for ${founder.name} copied successfully! Hyperlinks will be preserved if you paste in Gmail.`);
                                } catch (err) {
                                  try {
                                    await navigator.clipboard.writeText(plainText);
                                    alert(`Outreach email draft for ${founder.name} copied as plain text!`);
                                  } catch (fallbackErr) {
                                    alert("Failed to copy. Please select and copy manually.");
                                  }
                                }
                              }}
                              className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-100 hover:bg-indigo-50/30 px-2 py-0.5 rounded transition-colors cursor-pointer"
                              title="Copy final subject and body text to clipboard"
                            >
                              <Copy className="w-3 h-3" />
                              Copy Message
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          founder.status === "Replied" ? "bg-purple-100 text-purple-700 border border-purple-200" :
                          founder.status === "Sent" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                          founder.status === "Generated" ? "bg-indigo-100 text-indigo-700 border border-indigo-200" :
                          "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {founder.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectFounder(founder)}
                            className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                            title="Edit Pitch in Studio"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 px-2 py-1 rounded focus:outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
            <span>rows per page</span>
            <span className="text-slate-400 mx-2">|</span>
            <span>Showing {totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, totalRows)} of {totalRows} targets</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white font-semibold cursor-pointer"
            >
              Previous
            </button>
            
            <span className="px-2 font-semibold text-slate-700">Page {currentPage} of {totalPages || 1}</span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white font-semibold cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>

      </div>

      {/* Review Queue Sequencer Modal */}
      <AnimatePresence>
        {sequencerIndex >= 0 && currentSequencerFounder && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              
              {/* Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-600 text-[10px] font-bold uppercase rounded text-white">
                      Campaign Sequencer
                    </span>
                    <span className="text-xs text-slate-400">
                      Step {sequencerIndex + 1} of {sequencerIds.length}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold tracking-tight mt-1">
                    Review Outreach: {currentSequencerFounder.name} ({currentSequencerFounder.company})
                  </h3>
                </div>
                <button 
                  onClick={() => setSequencerIndex(-1)}
                  className="text-slate-400 hover:text-white font-bold text-sm bg-slate-800 p-1.5 rounded-lg cursor-pointer"
                >
                  ✕ Close Queue
                </button>
              </div>

              {/* Progress Slider */}
              <div className="w-full bg-slate-800 h-1">
                <div 
                  className="bg-purple-500 h-full transition-all duration-300"
                  style={{ width: `${((sequencerIndex + 1) / sequencerIds.length) * 100}%` }}
                />
              </div>

              {/* Body */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto flex-1">
                
                {/* Left Panel - Founder context */}
                <div className="md:col-span-4 space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Company Information</h5>
                    <p className="font-extrabold text-slate-900 text-base">{currentSequencerFounder.company}</p>
                    <p className="text-xs font-semibold text-purple-600 mt-1">{currentSequencerFounder.sector}</p>
                    <p className="text-xs text-slate-600 mt-2.5 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-100">
                      {currentSequencerFounder.context}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outreach Target</h5>
                    <p className="text-xs text-slate-700"><strong>Name:</strong> {currentSequencerFounder.name}</p>
                    <p className="text-xs text-slate-700"><strong>Email:</strong> <span className="select-all font-mono font-bold">{currentSequencerFounder.email}</span></p>
                    <p className="text-xs text-slate-700"><strong>Current Status:</strong> <span className="font-semibold text-indigo-600">{currentSequencerFounder.status}</span></p>
                  </div>

                  {/* LinkedIn Integration */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-left">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Linkedin className="w-3.5 h-3.5 text-indigo-500" />
                      LinkedIn Profile
                    </h5>
                    
                    <div className="flex flex-col gap-2">
                      {currentSequencerFounder.linkedInUrl ? (
                        <a
                          href={currentSequencerFounder.linkedInUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 bg-[#0077b5] hover:bg-[#005582] text-white text-[11px] font-bold py-1.5 px-3 rounded-lg transition-colors text-center w-full cursor-pointer"
                        >
                          <Linkedin className="w-3.5 h-3.5" />
                          Open Profile
                        </a>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 italic text-center block">
                          No profile URL saved yet.
                        </span>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(currentSequencerFounder.name + ' ' + currentSequencerFounder.company)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-[10px] font-bold py-1.5 px-2 rounded-lg text-center cursor-pointer"
                        >
                          <Search className="w-3 h-3" />
                          Search LinkedIn
                        </a>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(currentSequencerFounder.name + ' ' + currentSequencerFounder.company + ' LinkedIn')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-[10px] font-bold py-1.5 px-2 rounded-lg text-center cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Google Search
                        </a>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Save Profile Link</label>
                      <input
                        type="url"
                        placeholder="https://www.linkedin.com/..."
                        defaultValue={currentSequencerFounder.linkedInUrl || ""}
                        onBlur={async (e) => {
                          const newUrl = e.target.value.trim();
                          if (newUrl !== (currentSequencerFounder.linkedInUrl || "")) {
                            try {
                              await updateDoc(doc(db, "founders", currentSequencerFounder.id), {
                                linkedInUrl: newUrl || null,
                                updatedAt: new Date().toISOString()
                              });
                              // update state in parent
                              const updatedList = founders.map(f => f.id === currentSequencerFounder.id ? { ...f, linkedInUrl: newUrl || undefined } : f);
                              onFoundersUpdated(updatedList);
                            } catch (err) {
                              console.error("Failed to update LinkedIn URL:", err);
                            }
                          }
                        }}
                        className="w-full bg-white border border-slate-200 text-[10px] px-2 py-1 rounded-md focus:outline-none focus:border-indigo-400 font-mono text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="text-center p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] text-indigo-700 leading-relaxed">
                    <HelpCircle className="w-4 h-4 mx-auto mb-1 text-indigo-500" />
                    Pressing <strong>"Send via Mail Client"</strong> below opens this pitch directly in Outlook, Gmail, or Windows Mail, pre-filled, so you can make quick edits and press Send. It will automatically mark the target as <strong>Sent</strong>.
                  </div>
                </div>

                {/* Right Panel - Pitch Display */}
                <div className="md:col-span-8 flex flex-col space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Subject:</label>
                    <input 
                      type="text"
                      value={currentSequencerFounder.personalizedSubject || ""}
                      readOnly
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div className="flex-1 flex flex-col">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Body:</label>
                    <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans text-slate-800 leading-relaxed flex-1 overflow-y-auto whitespace-pre-wrap text-left">
                      {renderEmailBody(currentSequencerFounder.personalizedEmail || "")}
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer navigation */}
              <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-4">
                <div className="flex gap-2">
                  <button
                    onClick={handleSequencerPrev}
                    disabled={sequencerIndex === 0}
                    className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-white bg-slate-100 disabled:opacity-50 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <button
                    onClick={handleSequencerNext}
                    disabled={sequencerIndex === sequencerIds.length - 1}
                    className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-white bg-slate-100 disabled:opacity-50 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-2.5">
                   <button
                    onClick={async () => {
                      const plainText = `Subject: ${currentSequencerFounder.personalizedSubject}\n\n${currentSequencerFounder.personalizedEmail}`;
                      
                      const escapedSubject = (currentSequencerFounder.personalizedSubject || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                      const escapedBody = (currentSequencerFounder.personalizedEmail || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                      
                      let htmlBody = escapedBody.replace(/\n/g, "<br>");
                      htmlBody = htmlBody.replace(/Radhey Mohan Mishra/g, '<a href="https://www.linkedin.com/in/radheymohanmishra/" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">Radhey Mohan Mishra</a>');
                      htmlBody = htmlBody.replace(/Radhey/g, '<a href="https://www.linkedin.com/in/radheymohanmishra/" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">Radhey</a>');

                      const htmlText = `<strong>Subject:</strong> ${escapedSubject}<br><br>${htmlBody}`;

                      try {
                        if (navigator.clipboard && window.ClipboardItem) {
                          const blobPlain = new Blob([plainText], { type: "text/plain" });
                          const blobHtml = new Blob([htmlText], { type: "text/html" });
                          const data = [
                            new ClipboardItem({
                              "text/plain": blobPlain,
                              "text/html": blobHtml
                            })
                          ];
                          await navigator.clipboard.write(data);
                        } else {
                          await navigator.clipboard.writeText(plainText);
                        }
                        alert("Pitch copied to clipboard! Hyperlinks will be preserved if you paste into Gmail.");
                      } catch (err) {
                        try {
                          await navigator.clipboard.writeText(plainText);
                          alert("Pitch copied as plain text!");
                        } catch (fallbackErr) {
                          alert("Failed to copy pitch. Please copy manually.");
                        }
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 hover:bg-slate-100 bg-white rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Pitch Text
                  </button>

                  <button
                    onClick={() => handleSendAndMarkSent("gmail")}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold shadow-sm hover:shadow-md transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Send via Gmail Web
                  </button>

                  <button
                    onClick={() => handleSendAndMarkSent("mailto")}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-slate-500" />
                    Default Mail (Mailto)
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

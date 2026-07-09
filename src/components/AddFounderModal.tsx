import React, { useState } from "react";
import { X, Plus, AlertCircle } from "lucide-react";
import { Founder } from "../types";

interface AddFounderModalProps {
  onClose: () => void;
  onAdd: (newFounder: Omit<Founder, "id" | "createdAt" | "updatedAt">) => void;
}

export default function AddFounderModal({ onClose, onAdd }: AddFounderModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [sector, setSector] = useState("");
  const [email, setEmail] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [context, setContext] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !company.trim() || !email.trim()) {
      setError("Please fill out all required fields: First Name, Company, and Email.");
      return;
    }

    // Basic email regex test
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please provide a valid email address.");
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    onAdd({
      name: fullName,
      company: company.trim(),
      sector: sector.trim() || "Tech",
      context: context.trim() || "Early stage startup founder",
      email: email.trim(),
      status: "Draft",
      linkedInUrl: linkedInUrl.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-100 text-slate-800 rounded-lg">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-800">Add Target Founder</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Piyush"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Gupta"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. AdmitKard"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                Sector / Industry
              </label>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="e.g. EdTech, D2C"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                Founder Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. piyush@admitkard.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
              LinkedIn Profile URL (Optional)
            </label>
            <input
              type="url"
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
              placeholder="e.g. https://www.linkedin.com/in/username"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
              Context &amp; Background Details (Used for Personalization)
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
              placeholder="e.g. Funded in Shark Tank Season 2, currently scale-up series A phase. They make study abroad application automation tech."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Add Founder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React from "react";
import { Sparkles, FileText, Send, CheckCircle2, Award } from "lucide-react";
import { Founder } from "../types";

interface FounderCardProps {
  founder: Founder;
  isSelected: boolean;
  onClick: () => void;
}

export default function FounderCard({ founder, isSelected, onClick }: FounderCardProps) {
  // Sector check for styling
  const isEdTech = founder.sector?.toLowerCase().includes("edtech");
  const isSharkTank = founder.context?.toLowerCase().includes("shark tank");

  const statusStyles = {
    Draft: {
      bg: "bg-slate-50 text-slate-600 border-slate-100",
      icon: FileText,
      label: "Draft"
    },
    Generated: {
      bg: "bg-purple-50 text-purple-700 border-purple-100",
      icon: Sparkles,
      label: "Personalized"
    },
    Sent: {
      bg: "bg-blue-50 text-blue-700 border-blue-100",
      icon: Send,
      label: "Sent"
    },
    Replied: {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
      icon: CheckCircle2,
      label: "Replied"
    }
  };

  const status = statusStyles[founder.status] || statusStyles.Draft;
  const StatusIcon = status.icon;

  return (
    <div
      onClick={onClick}
      className={`p-4 border rounded-xl cursor-pointer transition-all ${
        isSelected
          ? "bg-slate-50 border-slate-900 shadow-xs ring-1 ring-slate-900/10"
          : "bg-white border-slate-100 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 leading-tight">
            {founder.name}
          </h4>
          <p className="text-xs text-slate-500 font-medium">
            {founder.company}
          </p>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border flex items-center gap-1 shrink-0 ${status.bg}`}
        >
          <StatusIcon className="w-2.5 h-2.5" />
          {status.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {isEdTech && (
          <span className="text-[10px] font-medium bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100">
            EdTech Focus
          </span>
        )}
        {isSharkTank && (
          <span className="text-[10px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-100 flex items-center gap-0.5">
            <Award className="w-2.5 h-2.5 shrink-0" />
            Shark Tank
          </span>
        )}
        {!isEdTech && !isSharkTank && (
          <span className="text-[10px] font-medium bg-slate-50 text-slate-500 px-2 py-0.5 rounded-md border border-slate-100">
            {founder.sector}
          </span>
        )}
      </div>

      <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">
        {founder.context}
      </p>
    </div>
  );
}

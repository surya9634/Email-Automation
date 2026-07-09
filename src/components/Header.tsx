import React from "react";
import { Mail, Sparkles, Send, Users, CheckCircle2 } from "lucide-react";
import { Founder } from "../types";

interface HeaderProps {
  founders: Founder[];
}

export default function Header({ founders }: HeaderProps) {
  const total = founders.length;
  const generated = founders.filter((f) => f.status === "Generated" || f.personalizedEmail).length;
  const sent = founders.filter((f) => f.status === "Sent" || f.status === "Replied").length;
  const replied = founders.filter((f) => f.status === "Replied").length;

  const stats = [
    {
      label: "Total Targets",
      value: total,
      icon: Users,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      label: "Pitches Personalized",
      value: generated,
      icon: Sparkles,
      color: "text-purple-600 bg-purple-50 border-purple-100",
    },
    {
      label: "Emails Sent",
      value: sent,
      icon: Send,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      label: "Replies Received",
      value: replied,
      icon: CheckCircle2,
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
  ];

  return (
    <div id="header-container" className="mb-8 border-b border-gray-100 pb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-slate-900 text-white rounded-lg">
              <Mail className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Founder Outreach Studio
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Radhey's personalized, AI-powered outreach launcher targeting early-stage Indian &amp; Shark Tank founders.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full self-start md:self-auto font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Outreach Workspace Active
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              id={`stat-card-${i}`}
              className="p-4 bg-white border border-gray-200/80 rounded-xl shadow-xs flex items-center gap-4 hover:border-gray-300 transition-colors"
            >
              <div className={`p-3 rounded-lg border ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-slate-800 tracking-tight">
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

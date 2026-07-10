import React, { useState } from "react";
import { Save, RotateCcw, AlertCircle, CheckCircle } from "lucide-react";
import { UserProfile } from "../types";

interface ProfileTabProps {
  profile: UserProfile;
  onSave: (updated: UserProfile) => void;
  onReset: () => void;
}

export default function ProfileTab({ profile, onSave, onReset }: ProfileTabProps) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [experience, setExperience] = useState(profile.experience);
  const [additionalContext, setAdditionalContext] = useState(profile.additionalContext || "");
  const [emailSignature, setEmailSignature] = useState(profile.emailSignature || "");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      bio,
      experience,
      additionalContext,
      emailSignature,
    });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleResetClick = () => {
    if (window.confirm("Are you sure you want to reset your bio details to the default outreach values?")) {
      const defaults = {
        name: "Suraj",
        bio: `Hi, I'm reaching out because I genuinely want to work with you and contribute to what you're building. I started building and figuring things out at 8, long before startups became a trend. Over the last 5+ years, I've worked across Product, Founder's Office, and Design in startups, not because I couldn't pick one lane, but because I love understanding the full picture and solving whatever the actual problem is. I also founded an EdTech startup. It failed. But that taught me more about building, distribution, and resilience than anything else could have. What I love most is taking things from 0 to 1, the messy, no-playbook phase where you just have to figure it out. That's where I'm most alive. On a personal note, I have lived with Cerebral Palsy my entire life. Every small thing that most people do without thinking has been a quiet battle for me. But fighting those battles every single day built something deep, with persistence, resilience, and an absolute refusal to quit. That's not a weakness I overcame. That's who I am. That's my answer to why me. I learn fast, take ownership, and I care deeply about what I'm building.`,
        experience: "5+ Years across Product, Founder's Office, Design, and EdTech Founder",
        additionalContext: "Targeting early-stage Indian founders who appreciate resilience, high-ownership, and versatile building.",
        emailSignature: "Best,\nSuraj"
      };
      onReset();
      setName(defaults.name);
      setBio(defaults.bio);
      setExperience(defaults.experience);
      setAdditionalContext(defaults.additionalContext);
      setEmailSignature(defaults.emailSignature);
      onSave(defaults);
    }
  };

  return (
    <div id="profile-tab-container" className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">My Pitch &amp; Background Profile</h2>
          <p className="text-xs text-slate-500">
            Define your core professional assets. These details are directly used by the Gemini AI to draft context-aware personalized outreach emails.
          </p>
        </div>
        <button
          onClick={handleResetClick}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Default
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              CTA / Offers
            </label>
            <input
              type="text"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
              My Core Bio (Used as Pitch Foundation)
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {bio.length} characters
            </span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={8}
            required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-slate-400 font-sans leading-relaxed"
            placeholder="Introduce yourself, your grit, experiences, and failure lessons..."
          />
          <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-slate-400 shrink-0" />
            Keep this raw, authentic, and packed with details so the AI drafts genuinely compelling letters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Ideal Role
            </label>
            <input
              type="text"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="e.g. Product Management, Founder's Office, Generalist Builder"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Email Signature
            </label>
            <input
              type="text"
              value={emailSignature}
              onChange={(e) => setEmailSignature(e.target.value)}
              placeholder="e.g. Best regards, Suraj"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {success && (
              <span className="text-xs text-emerald-600 flex items-center gap-1.5 font-medium animate-fade-in">
                <CheckCircle className="w-4 h-4" />
                Profile updated successfully!
              </span>
            )}
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Profile Configuration
          </button>
        </div>
      </form>
    </div>
  );
}

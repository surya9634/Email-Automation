export interface Founder {
  id: string;
  name: string;
  company: string;
  sector: string;
  context: string;
  email: string;
  status: "Draft" | "Generated" | "Sent" | "Replied" | "Failed";
  personalizedSubject?: string;
  personalizedEmail?: string;
  linkedInUrl?: string;
  personalizedLinkedInMsg?: string;
  createdAt: string;
  updatedAt: string;
  customTags?: Record<string, string>;
}

export interface UserProfile {
  name: string;
  bio: string;
  experience: string;
  additionalContext?: string;
  emailSignature?: string;
}

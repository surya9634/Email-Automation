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
  isVerified?: boolean;
  verificationStatus?: "Pending" | "Verified" | "Not Found";
  verificationLogs?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  name: string;
  bio: string;
  experience: string;
  additionalContext?: string;
  emailSignature?: string;
}

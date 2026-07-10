import React, { useEffect, useState, useMemo } from "react";
import { 
  Search, Plus, Copy, ExternalLink, Trash2, RefreshCw, 
  AlertCircle, CheckCircle, ChevronLeft, ChevronRight, 
  Mail, Users, CheckSquare, Square, Sparkles, Layers, 
  Database, Award, Send, CheckCircle2, ChevronDown, LogOut,
  Linkedin
} from "lucide-react";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut, 
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  linkWithPopup,
  linkWithRedirect,
  getRedirectResult
} from "firebase/auth";
import { db, auth } from "./firebase";
import { Founder, UserProfile } from "./types";
import { preseededFounders } from "./preseededFounders";
import AddFounderModal from "./components/AddFounderModal";
import EmailTab from "./components/EmailTab";
import LinkedInTab from "./components/LinkedInTab";
import DiscoverTab from "./components/DiscoverTab";
import ProfileTab from "./components/ProfileTab";

const DEFAULT_SUBJECT = "Want to work with [Company] | Why Me?";
const DEFAULT_BODY = `Hi [Name],

I'm reaching out because I genuinely want to work with you and contribute to what you're building at [Company] — been following your journey for a while now.

[Bio]

If there's any opportunity to contribute and grow alongside your team, I'd be really grateful for the chance. You won't regret giving this 16-year-old a shot.

[Signature]`;

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

// Helper to remove any undefined properties from an object so that Firestore does not throw an error
const safeFirestoreData = <T extends object>(obj: T): T => {
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean as T;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState("surajsharma963472@gmail.com");
  const [workspaceEmail, setWorkspaceEmail] = useState<string | null>(() => {
    return localStorage.getItem("workspace_email") || null;
  });
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup" | "reset">("login");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [isDemoUser, setIsDemoUser] = useState(false);

  // Gmail OAuth States
  const [gmailAccessToken, setGmailAccessToken] = useState<string | null>(() => {
    return sessionStorage.getItem("gmail_access_token") || null;
  });
  const [gmailUserEmail, setGmailUserEmail] = useState<string | null>(() => {
    return sessionStorage.getItem("gmail_user_email") || null;
  });
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);

  // Simplified Quick Email Paste State
  const [isQuickPasteOpen, setIsQuickPasteOpen] = useState(false);
  const [bulkCsvInput, setBulkCsvInput] = useState("");
  const [csvImportStatus, setCsvImportStatus] = useState<Founder["status"]>("Draft");
  const [isCsvImporting, setIsCsvImporting] = useState(false);
  const [expandedFounderId, setExpandedFounderId] = useState<string | null>(null);
  const handleToggleExpandRow = (id: string) => {
    setExpandedFounderId(prev => prev === id ? null : id);
  };

  const [founders, setFounders] = useState<Founder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  const [activeTab, setActiveTab] = useState<"email" | "linkedin" | "discover" | "profile">("email");
  const [templateLinkedIn, setTemplateLinkedIn] = useState(
    `Hi [Name],\n\nLoved your journey building [Company] in the [Sector] sector. Would love to connect and follow your building path.\n\nBest,\nSuraj`
  );
  const [profile, setProfile] = useState<UserProfile>({
    name: "Suraj",
    bio: `Hi, I'm reaching out because I genuinely want to work with you and contribute to what you're building. I started building and figuring things out at 8, long before startups became a trend. Over the last 5+ years, I've worked across Product, Founder's Office, and Design in startups, not because I couldn't pick one lane, but because I love understanding the full picture and solving whatever the actual problem is. I also founded an EdTech startup. It failed. But that taught me more about building, distribution, and resilience than anything else could have. What I love most is taking things from 0 to 1, the messy, no-playbook phase where you just have to figure it out. That's where I'm most alive. On a personal note, I have lived with Cerebral Palsy my entire life. Every small thing that most people do without thinking has been a quiet battle for me. But fighting those battles every single day built something deep, with persistence, resilience, and an absolute refusal to quit. That's not a weakness I overcame. That's who I am. That's my answer to why me. I learn fast, take ownership, and I care deeply about what I'm building.`,
    experience: "5+ Years across Product, Founder's Office, Design, and EdTech Founder",
    additionalContext: "Targeting early-stage Indian founders who appreciate resilience, high-ownership, and versatile building.",
    emailSignature: "Best,\nSuraj"
  });

  // Master Subject & Body Template Mixer state
  const [templateSubject, setTemplateSubject] = useState(DEFAULT_SUBJECT);
  const [templateBody, setTemplateBody] = useState(DEFAULT_BODY);
  
  // Table, Filter, and Selection States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [verificationFilter, setVerificationFilter] = useState("All");
  const [onlyVerifiedEmails, setOnlyVerifiedEmails] = useState(true);
  const isShootCancelled = React.useRef(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Onboarding Guide State
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return localStorage.getItem("show_onboarding_guide") !== "false";
  });

  // Interactive Modals and Actions states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Bulk Email Shoot States
  const [isShootingAll, setIsShootingAll] = useState(false);
  const [isCampaignSending, setIsCampaignSending] = useState(false);
  const [shootProgress, setShootProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [shootLogs, setShootLogs] = useState<string[]>([]);

  // AI Lead Discoverer States
  const [discoverNiche, setDiscoverNiche] = useState("");
  const [discoverLimit, setDiscoverLimit] = useState<number>(15);
  const [discoverTab, setDiscoverTab] = useState<"live" | "database">("database");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverStatusMsg, setDiscoverStatusMsg] = useState("");
  const [discoveredLeads, setDiscoveredLeads] = useState<any[]>([]);
  const [selectedDiscoverIds, setSelectedDiscoverIds] = useState<number[]>([]);

  // Pre-scraped Database Filter States
  const [dbSearchQuery, setDbSearchQuery] = useState("");
  const [dbSegmentFilter, setDbSegmentFilter] = useState("All");
  const [dbSizeFilter, setDbSizeFilter] = useState("All");
  const [dbNicheFilter, setDbNicheFilter] = useState("All");
  const [selectedDbIds, setSelectedDbIds] = useState<string[]>([]);
  const [selectedLocalDiscoverIds, setSelectedLocalDiscoverIds] = useState<string[]>([]);

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm?: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    isDanger = false,
    confirmText = "Confirm",
    cancelText = "Cancel"
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      isDanger,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        await onConfirm();
      }
    });
  };

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsDemoUser(false);
        const isGoogle = currentUser.providerData.some(p => p.providerId === "google.com");
        if (currentUser.email && (!localStorage.getItem("workspace_email") || !isGoogle)) {
          setWorkspaceEmail(currentUser.email);
          localStorage.setItem("workspace_email", currentUser.email);
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Pick up Gmail token after a redirect-based auth (popup was blocked)
  useEffect(() => {
    if (sessionStorage.getItem("gmail_redirect_pending") !== "1") return;
    getRedirectResult(auth).then((result) => {
      if (!result) return;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGmailAccessToken(credential.accessToken);
        setGmailUserEmail(result.user.email || "");
        sessionStorage.setItem("gmail_access_token", credential.accessToken);
        sessionStorage.setItem("gmail_user_email", result.user.email || "");
        showSuccess(`Gmail connected: ${result.user.email}`);
      }
      sessionStorage.removeItem("gmail_redirect_pending");
    }).catch((err) => {
      console.error("Redirect result error:", err);
      sessionStorage.removeItem("gmail_redirect_pending");
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps



  // Load from Firebase on Boot
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const foundersCol = collection(db, "founders");
        const snapshot = await getDocs(foundersCol);
        let foundersList: Founder[] = [];
        
        if (snapshot.empty) {
          // If Firestore is empty, seed with the preseeded founders in safe chunks of 100
          const validFounders = preseededFounders.filter(f => f.id !== "dialnexa-pratik");
          const batchSize = 100;
          const seedPromises = [];
          for (let i = 0; i < validFounders.length; i += batchSize) {
            const chunk = validFounders.slice(i, i + batchSize);
            const chunkBatch = writeBatch(db);
            chunk.forEach(f => {
              chunkBatch.set(doc(db, "founders", f.id), f);
            });
            seedPromises.push(chunkBatch.commit());
          }
          await Promise.all(seedPromises);
          foundersList = validFounders;
          showSuccess(`Successfully seeded database with ${validFounders.length} verified target founders!`);
        } else {
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            if (id === "dialnexa-pratik" || (data.name === "Pratik" && data.company === "DialNexa") || (data.company && data.company.toLowerCase() === "dialnexa")) {
              // Delete dynamically from Firestore to keep DB clean
              deleteDoc(doc(db, "founders", id)).catch(console.error);
            } else {
              foundersList.push({ id, ...data } as Founder);
            }
          });
        }

        // Sort by updatedAt descending
        foundersList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setFounders(foundersList);

        // Load Profile Configuration if exists
        try {
          const profileDoc = await getDoc(doc(db, "profile", "config"));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as UserProfile);
          }
        } catch (profileErr) {
          console.warn("Could not load profile from Firestore:", profileErr);
        }
      } catch (err: any) {
        console.error("Failed to fetch from Firestore:", err);
        setErrorMsg("Firestore connection issue. Loaded offline preseeded database.");
        setFounders(preseededFounders);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    if (!authEmail.trim() || (authMode !== "reset" && !authPassword)) {
      setAuthError("Please fill out all required fields.");
      setAuthLoading(false);
      return;
    }

    try {
      if (authMode === "login") {
        await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        setWorkspaceEmail(authEmail.trim());
        localStorage.setItem("workspace_email", authEmail.trim());
        showSuccess("Signed in successfully!");
      } else if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        setWorkspaceEmail(authEmail.trim());
        localStorage.setItem("workspace_email", authEmail.trim());
        showSuccess("Account created and signed in successfully!");
      } else if (authMode === "reset") {
        await sendPasswordResetEmail(auth, authEmail.trim());
        setAuthSuccess(`Password reset email sent to ${authEmail}. Please check your inbox.`);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = "Authentication failed. Please verify credentials.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        msg = "Invalid email or password. You can also try 'Instant Developer Demo Login'.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "This email is already registered.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password must be at least 6 characters long.";
      } else if (err.code === "auth/invalid-email") {
        msg = "Please provide a valid email address.";
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account"
      });
      const result = await signInWithPopup(auth, provider);
      if (result.user.email) {
        setWorkspaceEmail(result.user.email);
        localStorage.setItem("workspace_email", result.user.email);
      }
      showSuccess("Signed in with Google successfully!");
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      let msg = "Google authentication failed. Please try again.";
      if (err.code === "auth/popup-blocked") {
        msg = "The Google sign-in popup was blocked by your browser. Please enable popups or try the Email option.";
      } else if (err.code === "auth/popup-closed-by-user") {
        msg = "Google sign-in window was closed before completion.";
      } else if (err.code === "auth/cancelled-popup-request") {
        msg = "Popup request was cancelled or conflict occurred.";
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Helper to send email via Google Gmail API
  const sendGmailEmail = async (to: string, subject: string, body: string, token: string) => {
    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    
    // Format plain text to professional HTML email
    let htmlBody = body;
    if (!body.includes("<br") && !body.includes("<p")) {
      // Replace name with clickable LinkedIn links
      htmlBody = htmlBody
        .replace(/Suraj Sharma/g, '<a href="https://www.linkedin.com/in/surya-07-sharma/" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">Suraj Sharma</a>')
        .replace(/\bSuraj\b/g, '<a href="https://www.linkedin.com/in/surya-07-sharma/" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">Suraj</a>');
      
      // Convert newlines to HTML breaks
      htmlBody = htmlBody.replace(/\r?\n/g, "<br />");
    }

    // Wrap in standard professional system-font style block
    const finalHtmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; text-align: left;">
        ${htmlBody}
      </div>
    `.trim();

    const emailLines = [
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      finalHtmlBody
    ];
    const email = emailLines.join("\r\n");
    const base64SafeEmail = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        raw: base64SafeEmail
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gmail API error: ${response.status} - ${errText}`);
    }

    return await response.json();
  };

  // Action to connect Gmail inbox with send scope
  const handleConnectGmail = async () => {
    setIsConnectingGmail(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/gmail.send");
      provider.setCustomParameters({
        prompt: "consent select_account"
      });

      const tryPopup = async () => {
        let result;
        if (auth.currentUser) {
          // Check if Google is already linked — if so, skip linkWithPopup and just sign in
          const alreadyLinked = auth.currentUser.providerData.some(
            p => p.providerId === "google.com"
          );
          if (alreadyLinked) {
            result = await signInWithPopup(auth, provider);
          } else {
            try {
              result = await linkWithPopup(auth.currentUser, provider);
            } catch (linkErr: any) {
              if (
                linkErr.code === "auth/credential-already-in-use" ||
                linkErr.code === "auth/provider-already-linked" ||
                linkErr.code === "auth/email-already-in-use"
              ) {
                result = await signInWithPopup(auth, provider);
              } else {
                throw linkErr;
              }
            }
          }
        } else {
          result = await signInWithPopup(auth, provider);
        }
        return result;
      };

      try {
        const result = await tryPopup();
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          setGmailAccessToken(credential.accessToken);
          setGmailUserEmail(result.user.email || "");
          sessionStorage.setItem("gmail_access_token", credential.accessToken);
          sessionStorage.setItem("gmail_user_email", result.user.email || "");
          showSuccess(`Successfully connected Gmail: ${result.user.email}`);
        } else {
          showError("Failed to retrieve Gmail access token. Try again.");
        }
      } catch (popupErr: any) {
        if (
          popupErr.code === "auth/popup-blocked" ||
          popupErr.code === "auth/popup-closed-by-user"
        ) {
          // Popup was blocked — fall back to redirect (page will reload)
          showSuccess("Popup blocked by browser. Redirecting to Google sign-in...");
          sessionStorage.setItem("gmail_redirect_pending", "1");
          if (auth.currentUser) {
            await linkWithRedirect(auth.currentUser, provider);
          } else {
            await signInWithRedirect(auth, provider);
          }
          // Page reloads — token picked up in useEffect below
          return;
        }
        throw popupErr;
      }
    } catch (err: any) {
      console.error("Gmail connect error:", err);
      showError("Gmail connection failed. Please try again.");
    } finally {
      setIsConnectingGmail(false);
    }
  };

  const handleDisconnectGmail = () => {
    setGmailAccessToken(null);
    setGmailUserEmail(null);
    sessionStorage.removeItem("gmail_access_token");
    sessionStorage.removeItem("gmail_user_email");
    showSuccess("Disconnected Gmail account.");
  };

  const handleSaveProfile = async (updated: UserProfile) => {
    try {
      await setDoc(doc(db, "profile", "config"), safeFirestoreData(updated));
      setProfile(updated);
      showSuccess("Profile updated in database!");
    } catch (err) {
      console.error("Error saving profile:", err);
      showError("Failed to save profile to database.");
    }
  };

  const handleSendGmailInstantly = async (founder: Founder, manualSubject?: string, manualBody?: string) => {
    if (!gmailAccessToken) {
      showError("Please connect your Gmail account first to send instantly.");
      return;
    }
    const resolved = resolveTemplate(templateSubject, templateBody, founder);
    const subject = manualSubject || founder.personalizedSubject || resolved.subject;
    const body = manualBody || founder.personalizedEmail || resolved.body;

    try {
      showSuccess(`Sending email to ${founder.name}...`);
      await sendGmailEmail(founder.email, subject, body, gmailAccessToken);
      await handleUpdateStatus(founder.id, "Sent");
      // Update local personalized subject & body if they weren't saved yet
      if (!founder.personalizedSubject || !founder.personalizedEmail) {
        try {
          await updateDoc(doc(db, "founders", founder.id), safeFirestoreData({
            personalizedSubject: subject,
            personalizedEmail: body,
            updatedAt: new Date().toISOString()
          }));
        } catch (dbErr) {
          console.warn("Database sync warning (email was sent successfully):", dbErr);
        }
        setFounders(prev => prev.map(f => f.id === founder.id ? {
          ...f,
          personalizedSubject: subject,
          personalizedEmail: body,
          updatedAt: new Date().toISOString()
        } : f));
      }
      showSuccess(`✅ Email sent successfully to ${founder.name} (${founder.company})!`);
    } catch (err: any) {
      console.error("Gmail Send Error:", err);
      showError(`Failed to send email: ${err.message || "Unknown error"}`);
    }
  };

  const handleDemoLogin = () => {
    setIsDemoUser(true);
    showSuccess("Logged in successfully in Instant Access Demo Mode!");
  };

  const handleSignOut = async () => {
    try {
      if (isDemoUser) {
        setIsDemoUser(false);
      } else {
        await signOut(auth);
      }
      setUser(null);
      setGmailAccessToken(null);
      setGmailUserEmail(null);
      setWorkspaceEmail(null);
      localStorage.removeItem("workspace_email");
      setAuthPassword("");
      showSuccess("Signed out successfully.");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  // Bulk CSV / Contact List Import
  const handleBulkCsvImport = async () => {
    if (!bulkCsvInput.trim()) {
      showError("Please paste or type at least one email address or CSV line.");
      return;
    }

    setIsCsvImporting(true);
    try {
      // Robust CSV/TSV parser
      const parseCSV = (text: string): { headers: string[], rows: string[][] } => {
        const lines: string[][] = [];
        let row: string[] = [];
        let currentToken = '';
        let inQuotes = false;
        
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const nextChar = text[i + 1];
          
          if (inQuotes) {
            if (char === '"') {
              if (nextChar === '"') {
                currentToken += '"';
                i++;
              } else {
                inQuotes = false;
              }
            } else {
              currentToken += char;
            }
          } else {
            if (char === '"') {
              inQuotes = true;
            } else if (char === ',' || char === '\t') {
              row.push(currentToken.trim());
              currentToken = '';
            } else if (char === '\r' || char === '\n') {
              if (char === '\r' && nextChar === '\n') {
                i++;
              }
              row.push(currentToken.trim());
              currentToken = '';
              if (row.some(Boolean)) {
                lines.push(row);
              }
              row = [];
            } else {
              currentToken += char;
            }
          }
        }
        
        if (currentToken || row.length > 0) {
          row.push(currentToken.trim());
          if (row.some(Boolean)) {
            lines.push(row);
          }
        }
        
        if (lines.length === 0) return { headers: [], rows: [] };
        
        const firstLine = lines[0];
        const isHeaderColumn = (col: string) => {
          const clean = col.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
          return ["name", "email", "company", "sector", "context", "linkedin", "notes", "fullname", "emailaddress", "companyname", "linkedinurl"].includes(clean);
        };
        const hasCommonHeader = firstLine.some(isHeaderColumn);
        
        if (hasCommonHeader) {
          return { headers: firstLine, rows: lines.slice(1) };
        } else {
          const headers = firstLine.map((_, idx) => `column${idx + 1}`);
          return { headers, rows: lines };
        }
      };

      const { headers, rows } = parseCSV(bulkCsvInput);
      const newFoundersList: Founder[] = [];
      const timestamp = new Date().toISOString();

      rows.forEach((row, index) => {
        let name = "Founder";
        let email = "";
        let company = "SaaS Startup";
        let sector = "SaaS";
        let context = "Imported from list";
        let linkedInUrl = "";
        const customTags: Record<string, string> = {};

        // 1. Search for any column containing an email address
        const emailIdx = row.findIndex(val => val.includes("@"));
        if (emailIdx !== -1) {
          email = row[emailIdx];
        }

        // 2. Map based on headers
        headers.forEach((header, idx) => {
          const value = row[idx] || "";
          const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");

          if (cleanHeader === "name" || cleanHeader === "fullname" || cleanHeader === "foundername") {
            name = value || name;
          } else if (cleanHeader === "email" || cleanHeader === "emailaddress" || cleanHeader === "mail") {
            email = value || email;
          } else if (cleanHeader === "company" || cleanHeader === "companyname" || cleanHeader === "firm") {
            company = value || company;
          } else if (cleanHeader === "sector" || cleanHeader === "industry") {
            sector = value || sector;
          } else if (cleanHeader === "context" || cleanHeader === "notes" || cleanHeader === "background") {
            context = value || context;
          } else if (cleanHeader === "linkedin" || cleanHeader === "linkedinurl") {
            linkedInUrl = value || linkedInUrl;
          } else {
            if (idx !== emailIdx) {
              customTags[header] = value;
            }
          }
        });

        // 3. Positional fallbacks for headerless layout
        const isHeaderless = headers.every(h => h.startsWith("column"));
        if (isHeaderless) {
          if (row.length >= 1 && emailIdx !== 0) name = row[0] || name;
          if (row.length >= 3 && emailIdx !== 2) company = row[2] || company;
          if (row.length >= 4 && emailIdx !== 3) sector = row[3] || sector;
          if (row.length >= 5) context = row.slice(4).join(", ") || context;
        }

        if (!email || !email.includes("@")) {
          return;
        }

        const generatedId = company.toLowerCase().replace(/[^a-z0-9]/g, "") + "-" + Date.now() + "-" + index + "-" + Math.floor(Math.random() * 100);

        newFoundersList.push({
          id: generatedId,
          name,
          company,
          sector,
          email,
          context,
          ...(linkedInUrl ? { linkedInUrl } : {}),
          ...(Object.keys(customTags).length > 0 ? { customTags } : {}),
          status: csvImportStatus,
          createdAt: timestamp,
          updatedAt: timestamp
        });
      });

      if (newFoundersList.length === 0) {
        showError("No valid targets with email addresses could be parsed from your input.");
        setIsCsvImporting(false);
        return;
      }

      // Add to Firestore in chunks
      const batchSize = 100;
      for (let i = 0; i < newFoundersList.length; i += batchSize) {
        const chunk = newFoundersList.slice(i, i + batchSize);
        const batch = writeBatch(db);
        chunk.forEach(f => {
          batch.set(doc(db, "founders", f.id), safeFirestoreData(f));
        });
        await batch.commit();
      }

      setFounders(prev => [...newFoundersList, ...prev]);
      setBulkCsvInput("");
      showSuccess(`Successfully imported ${newFoundersList.length} founders to status '${csvImportStatus}'!`);
    } catch (err) {
      console.error("Bulk CSV import error:", err);
      showError("Failed to import CSV dataset. Verify structure.");
    } finally {
      setIsCsvImporting(false);
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sectorFilter]);

  // Toast Helpers
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 5000);
  };

  // Wipe database and re-seed to start fresh
  const handleReSeedDataset = () => {
    showConfirm(
      "Restore Pristine Database?",
      `Are you sure you want to restore the target database? This will reset all statuses to 'Draft' and restore the ${preseededFounders.length} preseeded Indian SaaS & EdTech founders.`,
      async () => {
        try {
          setLoading(true);
          setErrorMsg("");
          
          // Delete existing records first in chunked batches in parallel to avoid Firestore limits
          const snapshot = await getDocs(collection(db, "founders"));
          const docsArray = snapshot.docs;
          if (docsArray.length > 0) {
            const deletePromises = [];
            const deleteBatchSize = 100;
            for (let i = 0; i < docsArray.length; i += deleteBatchSize) {
              const chunk = docsArray.slice(i, i + deleteBatchSize);
              const chunkBatch = writeBatch(db);
              chunk.forEach((docSnap) => {
                chunkBatch.delete(docSnap.ref);
              });
              deletePromises.push(chunkBatch.commit());
            }
            await Promise.all(deletePromises);
          }

          // Write new records
          const timestamp = new Date().toISOString();
          const freshList: Founder[] = preseededFounders.map(f => ({
            ...f,
            status: "Draft",
            personalizedSubject: "",
            personalizedEmail: "",
            createdAt: timestamp,
            updatedAt: timestamp
          }));

          // Parallel chunk writes
          const batchSize = 100;
          const writePromises = [];
          for (let i = 0; i < freshList.length; i += batchSize) {
            const chunk = freshList.slice(i, i + batchSize);
            const chunkBatch = writeBatch(db);
            chunk.forEach(f => {
              chunkBatch.set(doc(db, "founders", f.id), f);
            });
            writePromises.push(chunkBatch.commit());
          }
          await Promise.all(writePromises);

          setFounders(freshList);
          setSelectedIds([]);
          showSuccess(`Successfully restored pristine database of ${freshList.length} founders!`);
        } catch (err: any) {
          console.error("Failed to re-seed database:", err);
          showError("Failed to restore dataset. Verify your connection.");
        } finally {
          setLoading(false);
        }
      },
      false,
      "Restore Data"
    );
  };

  // Instant restore helper to bring back 500 preseeded leads
  const handleInstantRestore500 = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      
      // Delete existing records first in chunked batches in parallel
      const snapshot = await getDocs(collection(db, "founders"));
      const docsArray = snapshot.docs;
      if (docsArray.length > 0) {
        const deletePromises = [];
        const deleteBatchSize = 100;
        for (let i = 0; i < docsArray.length; i += deleteBatchSize) {
          const chunk = docsArray.slice(i, i + deleteBatchSize);
          const chunkBatch = writeBatch(db);
          chunk.forEach((docSnap) => {
            chunkBatch.delete(docSnap.ref);
          });
          deletePromises.push(chunkBatch.commit());
        }
        await Promise.all(deletePromises);
      }

      // Write new records
      const timestamp = new Date().toISOString();
      const freshList: Founder[] = preseededFounders.map(f => ({
        ...f,
        status: "Draft",
        personalizedSubject: "",
        personalizedEmail: "",
        createdAt: timestamp,
        updatedAt: timestamp
      }));

      // Parallel chunk writes
      const batchSize = 100;
      const writePromises = [];
      for (let i = 0; i < freshList.length; i += batchSize) {
        const chunk = freshList.slice(i, i + batchSize);
        const chunkBatch = writeBatch(db);
        chunk.forEach(f => {
          chunkBatch.set(doc(db, "founders", f.id), f);
        });
        writePromises.push(chunkBatch.commit());
      }
      await Promise.all(writePromises);

      setFounders(freshList);
      setSelectedIds([]);
      showSuccess(`Successfully restored and imported all ${preseededFounders.length} pristine preseeded founder leads!`);
    } catch (err: any) {
      console.error("Failed to re-seed database:", err);
      showError("Failed to restore dataset. Verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Discover emerging small startups matching niche using server-side Gemini Search Grounding
  const handleDiscoverLeads = async () => {
    if (!discoverNiche.trim()) {
      showError("Please specify a target industry or niche to search (e.g., 'Indian FinTech micro-SaaS').");
      return;
    }

    try {
      setIsDiscovering(true);
      setErrorMsg("");
      setDiscoveredLeads([]);
      setDiscoverStatusMsg("Step 1/3: Dispatching search crawler to scan Google & LinkedIn indexes...");
      
      const interval = setInterval(() => {
        setDiscoverStatusMsg((prev) => {
          if (prev.includes("Step 1")) {
            return "Step 2/3: Researching founding team profiles and building corporate emails...";
          } else if (prev.includes("Step 2")) {
            return "Step 3/3: Running real-time server-side DNS MX record check on company domains...";
          }
          return prev;
        });
      }, 3500);

      const response = await fetch("/api/leads/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: discoverNiche, limit: discoverLimit }),
      });

      clearInterval(interval);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Discover API failed to run.");
      }

      const result = await response.json();
      if (result && Array.isArray(result.leads)) {
        setDiscoveredLeads(result.leads);
        // Automatically check all discovered leads
        setSelectedDiscoverIds(result.leads.map((_: any, idx: number) => idx));
        showSuccess(`Discovered ${result.leads.length} real, emerging startups with validated corporate domains!`);
      } else {
        throw new Error("Invalid response format received from discovery service.");
      }
    } catch (err: any) {
      console.error("Discovery failed:", err);
      showError(err.message || "Failed to search for target founders. Please check your Gemini key or retry.");
    } finally {
      setIsDiscovering(false);
      setDiscoverStatusMsg("");
    }
  };

  // Import verified leads selected from the Discover list into active Firestore directory
  const handleImportDiscoveredLeads = async () => {
    if (selectedDiscoverIds.length === 0) {
      showError("Please check at least one lead from the discovered list to import.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      
      const leadsToImport = discoveredLeads.filter((_, idx) => selectedDiscoverIds.includes(idx));
      const timestamp = new Date().toISOString();
      
      const newFounders: Founder[] = [];
      const importPromises = leadsToImport.map(async (lead) => {
        const generatedId = lead.company.toLowerCase().replace(/[^a-z0-9]/g, "") + "-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
        const fullFounder: Founder = {
          id: generatedId,
          name: lead.name,
          company: lead.company,
          sector: lead.sector,
          context: lead.context,
          email: lead.email,
          status: "Draft",
          linkedInUrl: lead.linkedInUrl || "",
          isVerified: !!lead.isVerified,
          verificationStatus: lead.verificationStatus || "Verified",
          verificationLogs: lead.verificationLogs || "",
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        // Write to Firestore
        await setDoc(doc(db, "founders", generatedId), safeFirestoreData(fullFounder));
        newFounders.push(fullFounder);
      });

      await Promise.all(importPromises);

      // Append to local state so they show up instantly in the table
      setFounders((prev) => [...newFounders, ...prev]);
      
      // Clear discovery panel state
      setDiscoveredLeads([]);
      setSelectedDiscoverIds([]);
      setDiscoverNiche("");
      
      showSuccess(`Successfully imported ${newFounders.length} target founders directly to your directory!`);
    } catch (err: any) {
      console.error("Import failed:", err);
      showError("Could not import leads to the active workspace database.");
    } finally {
      setLoading(false);
    }
  };

  // Memoized filter calculation for Pre-Scraped 200+ Indian Co-founders Database
  const filteredDbLeads = useMemo(() => {
    return preseededFounders.filter(f => {
      // Search text filter
      const matchesSearch = 
        f.name.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
        f.company.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
        f.sector.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
        f.context.toLowerCase().includes(dbSearchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // Segment Filter (Shark Tank, Funded, Bootstrapped)
      if (dbSegmentFilter !== "All") {
        if (dbSegmentFilter === "Shark Tank India Alumni") {
          if (!f.context.includes("Shark Tank India")) return false;
        } else if (dbSegmentFilter === "Funded Tech Startups") {
          if (!f.context.includes("seed") && !f.context.includes("Series") && !f.context.includes("funding")) return false;
        } else if (dbSegmentFilter === "Bootstrapped & Profitable") {
          if (!f.context.includes("bootstrapped") && !f.context.includes("profitable") && !f.context.includes("organically")) return false;
        }
      }

      // Company Size Filter ("10-50 employees", "51-200 employees", "200+ employees")
      if (dbSizeFilter !== "All") {
        if (!f.context.includes(`Size: ${dbSizeFilter}`) && !f.context.includes(`[Size: ${dbSizeFilter}]`)) return false;
      }

      // Niche Filter ("AI & Tech", "EdTech", "FinTech", "D2C & Consumer Goods", "SaaS & DevTools")
      if (dbNicheFilter !== "All") {
        const sectorLower = f.sector.toLowerCase();
        if (dbNicheFilter === "AI & Tech") {
          if (!sectorLower.includes("ai") && !sectorLower.includes("deeptech") && !sectorLower.includes("tech")) return false;
        } else if (dbNicheFilter === "EdTech") {
          if (!sectorLower.includes("edtech") && !sectorLower.includes("learning") && !sectorLower.includes("upskilling")) return false;
        } else if (dbNicheFilter === "FinTech") {
          if (!sectorLower.includes("fintech") && !sectorLower.includes("payment") && !sectorLower.includes("compliance") && !sectorLower.includes("finance")) return false;
        } else if (dbNicheFilter === "D2C & Consumer Goods") {
          if (!sectorLower.includes("d2c") && !sectorLower.includes("beverage") && !sectorLower.includes("food") && !sectorLower.includes("fashion") && !sectorLower.includes("apparel") && !sectorLower.includes("beauty")) return false;
        } else if (dbNicheFilter === "SaaS & DevTools") {
          if (!sectorLower.includes("saas") && !sectorLower.includes("developer") && !sectorLower.includes("devtools") && !sectorLower.includes("ops")) return false;
        }
      }

      return true;
    });
  }, [dbSearchQuery, dbSegmentFilter, dbSizeFilter, dbNicheFilter]);

  // Import checked targets from Pre-scraped Database to active Outreach Queue
  const handleImportPreScrapedLeads = async () => {
    if (selectedDbIds.length === 0) {
      showError("Please check at least one lead from the pre-scraped database to import.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const leadsToImport = preseededFounders.filter(f => selectedDbIds.includes(f.id));
      const timestamp = new Date().toISOString();
      const newFounders: Founder[] = [];

      const importPromises = leadsToImport.map(async (lead) => {
        const fullFounder: Founder = {
          ...lead,
          status: "Draft",
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        // Write to Firestore
        await setDoc(doc(db, "founders", lead.id), safeFirestoreData(fullFounder));
        newFounders.push(fullFounder);
      });

      await Promise.all(importPromises);

      // Add to local state so they appear immediately in the outreach list
      setFounders((prev) => {
        // Filter out any duplicates to keep state perfectly clean
        const existingIds = new Set(prev.map(p => p.id));
        const filteredNew = newFounders.filter(nf => !existingIds.has(nf.id));
        return [...filteredNew, ...prev];
      });

      setSelectedDbIds([]);
      showSuccess(`Successfully imported ${newFounders.length} target co-founders to your active outreach list!`);
    } catch (err: any) {
      console.error("Database import failed:", err);
      showError("Failed to import checked leads from pre-scraped database.");
    } finally {
      setLoading(false);
    }
  };

  // Memoized local matches in LinkedIn Search Tab (Tab 2) using pre-scraped founders
  const localDiscoverMatches = useMemo(() => {
    if (!discoverNiche.trim()) return [];
    const query = discoverNiche.trim().toLowerCase();
    return preseededFounders.filter(f => 
      f.name.toLowerCase().includes(query) ||
      f.company.toLowerCase().includes(query) ||
      f.sector.toLowerCase().includes(query) ||
      f.context.toLowerCase().includes(query)
    );
  }, [discoverNiche]);

  // Import checked targets from the local search matches in LinkedIn Tab
  const handleImportLocalDiscoverLeads = async () => {
    if (selectedLocalDiscoverIds.length === 0) {
      showError("Please check at least one lead from the matching search results to import.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const leadsToImport = preseededFounders.filter(f => selectedLocalDiscoverIds.includes(f.id));
      const timestamp = new Date().toISOString();
      const newFounders: Founder[] = [];

      const importPromises = leadsToImport.map(async (lead) => {
        const fullFounder: Founder = {
          ...lead,
          status: "Draft",
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        // Write to Firestore
        await setDoc(doc(db, "founders", lead.id), safeFirestoreData(fullFounder));
        newFounders.push(fullFounder);
      });

      await Promise.all(importPromises);

      // Add to local state so they appear immediately in the outreach list
      setFounders((prev) => {
        const existingIds = new Set(prev.map(p => p.id));
        const filteredNew = newFounders.filter(nf => !existingIds.has(nf.id));
        return [...filteredNew, ...prev];
      });

      setSelectedLocalDiscoverIds([]);
      showSuccess(`Successfully imported ${newFounders.length} founders to your active outreach list!`);
    } catch (err: any) {
      console.error("Local match import failed:", err);
      showError("Failed to import checked leads from search results.");
    } finally {
      setLoading(false);
    }
  };

  // Reset any outreach emails back to Draft status (Bring back wasted credits)
  const handleResetSentFailed = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const listCopy = [...founders];
      const targets = listCopy.filter(f => f.status !== "Draft");
      
      if (targets.length === 0) {
        showError("No sent, failed, or active outreach emails found to reset.");
        return;
      }

      const batchSize = 100;
      const updatePromises = [];
      for (let i = 0; i < targets.length; i += batchSize) {
        const chunk = targets.slice(i, i + batchSize);
        const chunkBatch = writeBatch(db);
        chunk.forEach(f => {
          chunkBatch.set(doc(db, "founders", f.id), {
            status: "Draft",
            updatedAt: new Date().toISOString()
          }, { merge: true });
          const idx = listCopy.findIndex(item => item.id === f.id);
          if (idx !== -1) {
            listCopy[idx].status = "Draft";
            listCopy[idx].updatedAt = new Date().toISOString();
          }
        });
        updatePromises.push(chunkBatch.commit());
      }
      await Promise.all(updatePromises);

      setFounders(listCopy);
      showSuccess(`Successfully brought back ${targets.length} outreach emails to 'Draft' status!`);
    } catch (err: any) {
      console.error("Failed to reset sent/failed emails:", err);
      showError("Failed to reset emails. Verify connection.");
    } finally {
      setLoading(false);
    }
  };

  // Permanently delete any Sent or Failed emails to purge wasted/invalid contacts
  const handleDeleteSentFailed = async () => {
    showConfirm(
      "Delete All Sent and Failed Leads?",
      "Are you sure you want to permanently delete all Sent and Failed outreach leads? This will delete them from your active database so you don't accidentally email them again.",
      async () => {
        try {
          setLoading(true);
          setErrorMsg("");
          const listCopy = [...founders];
          const targets = listCopy.filter(f => f.status === "Sent" || f.status === "Failed");
          
          if (targets.length === 0) {
            showError("No sent or failed leads found to delete.");
            return;
          }

          const batchSize = 100;
          const deletePromises = [];
          for (let i = 0; i < targets.length; i += batchSize) {
            const chunk = targets.slice(i, i + batchSize);
            const chunkBatch = writeBatch(db);
            chunk.forEach(f => {
              chunkBatch.delete(doc(db, "founders", f.id));
            });
            deletePromises.push(chunkBatch.commit());
          }
          await Promise.all(deletePromises);

          const updatedList = listCopy.filter(f => f.status !== "Sent" && f.status !== "Failed");
          setFounders(updatedList);
          showSuccess(`Successfully removed ${targets.length} sent/failed leads from the database!`);
        } catch (err: any) {
          console.error("Failed to delete sent/failed leads:", err);
          showError("Failed to delete leads. Verify connection.");
        } finally {
          setLoading(false);
        }
      },
      true,
      "Delete Leads"
    );
  };

  // Automated single contact verification with backend / Gemini
  const handleVerifyFounder = async (founderId: string) => {
    const founder = founders.find(f => f.id === founderId);
    if (!founder) return;

    try {
      setLoading(true);
      setErrorMsg("");
      
      const response = await fetch("/api/verify-founder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          founderName: founder.name,
          companyName: founder.company,
          sector: founder.sector,
          context: founder.context,
          email: founder.email,
          linkedInUrl: founder.linkedInUrl,
        }),
      });

      if (!response.ok) {
        throw new Error("Verification API failed.");
      }

      const result = await response.json();
      
      // Update local state and Firestore
      const updatedFounder = {
        ...founder,
        email: result.email || founder.email,
        linkedInUrl: result.linkedInUrl || founder.linkedInUrl,
        isVerified: !!result.isVerified,
        verificationStatus: result.status || "Verified",
        verificationLogs: result.logs || "",
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, "founders", founderId), safeFirestoreData(updatedFounder));

      setFounders(prev => prev.map(f => f.id === founderId ? updatedFounder : f));
      showSuccess(`Verified ${founder.name}'s contact details successfully!`);
    } catch (err: any) {
      console.error("Failed to verify founder:", err);
      showError("Contact verification failed. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  // Bulk verify selected contacts in parallel batches
  const handleBulkVerify = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      setLoading(true);
      setErrorMsg("");
      let successCount = 0;

      // Run concurrent verification tasks at a time to stay within rate limits and show fast progress
      const batchSize = 5;
      for (let i = 0; i < selectedIds.length; i += batchSize) {
        const chunk = selectedIds.slice(i, i + batchSize);
        await Promise.all(
          chunk.map(async (id) => {
            const founder = founders.find(f => f.id === id);
            if (!founder) return;

            try {
              const response = await fetch("/api/verify-founder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  founderName: founder.name,
                  companyName: founder.company,
                  sector: founder.sector,
                  context: founder.context,
                  email: founder.email,
                  linkedInUrl: founder.linkedInUrl,
                }),
              });

              if (response.ok) {
                const result = await response.json();
                const updatedFounder = {
                  ...founder,
                  email: result.email || founder.email,
                  linkedInUrl: result.linkedInUrl || founder.linkedInUrl,
                  isVerified: !!result.isVerified,
                  verificationStatus: result.status || "Verified",
                  verificationLogs: result.logs || "",
                  updatedAt: new Date().toISOString(),
                };
                await updateDoc(doc(db, "founders", id), safeFirestoreData(updatedFounder));
                setFounders(prev => prev.map(f => f.id === id ? updatedFounder : f));
                successCount++;
              }
            } catch (err) {
              console.error("Failed to verify in bulk for ID:", id, err);
            }
          })
        );
      }

      showSuccess(`Successfully ran automated verification on ${successCount} contact profiles!`);
      setSelectedIds([]);
    } catch (err: any) {
      console.error("Failed bulk verification:", err);
      showError("Automated bulk verification encountered an issue.");
    } finally {
      setLoading(false);
    }
  };

  // Add custom founder
  const handleAddFounder = async (newF: Omit<Founder, "id" | "createdAt" | "updatedAt">) => {
    try {
      const generatedId = newF.company.toLowerCase().replace(/[^a-z0-9]/g, "") + "-" + Date.now();
      const timestamp = new Date().toISOString();
      const fullFounder: Founder = {
        ...newF,
        id: generatedId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await setDoc(doc(db, "founders", generatedId), safeFirestoreData(fullFounder));
      setFounders((prev) => [fullFounder, ...prev]);
      showSuccess(`Added custom target founder: ${newF.name} (${newF.company})`);
    } catch (err) {
      console.error("Error adding founder:", err);
      showError("Could not save to database. Added locally.");
      const generatedId = "custom-" + Date.now();
      const timestamp = new Date().toISOString();
      const fullFounder: Founder = {
        ...newF,
        id: generatedId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      setFounders((prev) => [fullFounder, ...prev]);
    }
  };

  // Delete individual founder
  const handleDeleteFounder = (id: string) => {
    showConfirm(
      "Delete Target Founder?",
      "Are you sure you want to remove this founder from your database?",
      async () => {
        try {
          await deleteDoc(doc(db, "founders", id));
          setFounders(prev => prev.filter(f => f.id !== id));
          setSelectedIds(prev => prev.filter(x => x !== id));
          showSuccess("Target founder removed.");
        } catch (err) {
          console.error("Error deleting:", err);
          setFounders(prev => prev.filter(f => f.id !== id));
        }
      },
      true,
      "Delete"
    );
  };

  // Inline Tracking Status Update
  const handleUpdateStatus = async (id: string, newStatus: Founder["status"]) => {
    try {
      await updateDoc(doc(db, "founders", id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      setFounders(prev => prev.map(f => f.id === id ? { ...f, status: newStatus, updatedAt: new Date().toISOString() } : f));
      showSuccess(`Updated status to ${newStatus}`);
    } catch (err) {
      console.error("Error updating status:", err);
      setFounders(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
    }
  };

  // Dynamic Template Resolver
  const resolveTemplate = (subjectTemplate: string, bodyTemplate: string, f: Founder) => {
    const firstName = f.name ? f.name.trim().split(/\s+/)[0] : "Founder";
    // Profile-level substitutions (from Pitch Profile tab)
    const applyProfile = (text: string) => text
      .replace(/\[Bio\]/g, profile.bio || "")
      .replace(/\[Experience\]/g, profile.experience || "")
      .replace(/\[Signature\]/g, profile.emailSignature || "")
      .replace(/\[MyName\]/g, profile.name || "Suraj")
      .replace(/\[AdditionalContext\]/g, profile.additionalContext || "");

    let s = applyProfile(subjectTemplate
      .replace(/\[Name\]/g, firstName)
      .replace(/\[Company\]/g, f.company)
      .replace(/\[Sector\]/g, f.sector)
      .replace(/\[Context\]/g, f.context || ""));

    let b = applyProfile(bodyTemplate
      .replace(/\[Name\]/g, firstName)
      .replace(/\[Company\]/g, f.company)
      .replace(/\[Sector\]/g, f.sector)
      .replace(/\[Context\]/g, f.context || ""));

    if (f.customTags) {
      Object.entries(f.customTags).forEach(([key, val]) => {
        const placeholder = new RegExp(`\\[${key}\\]`, "g");
        s = s.replace(placeholder, val || "");
        b = b.replace(placeholder, val || "");
      });
    }
    return { subject: s, body: b };
  };

  // Apply template in batch to Selected or All
  const handleBatchApplyTemplate = async (applyToAll: boolean) => {
    const targets = applyToAll ? filteredFounders : filteredFounders.filter(f => selectedIds.includes(f.id));
    if (targets.length === 0) {
      showError(applyToAll ? "No founders matching current filter criteria." : "Please select at least one founder from the table.");
      return;
    }

    try {
      setBulkActionLoading(true);
      setBulkProgress({ current: 0, total: targets.length });

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

      setFounders(listCopy);
      setSelectedIds([]);
      showSuccess(`Applied outreach template and set 'Generated' status for ${targets.length} founders!`);
    } catch (err: any) {
      console.error("Batch apply error:", err);
      showError("Failed to apply template. Connection error.");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk Status Change / Bulk Delete
  const handleBulkStatusChange = async (newStatus: Founder["status"]) => {
    if (selectedIds.length === 0) return;
    try {
      setBulkActionLoading(true);
      const batchSize = 100;
      const listCopy = [...founders];

      for (let i = 0; i < selectedIds.length; i += batchSize) {
        const chunk = selectedIds.slice(i, i + batchSize);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.update(doc(db, "founders", id), {
            status: newStatus,
            updatedAt: new Date().toISOString()
          });
          const idx = listCopy.findIndex(f => f.id === id);
          if (idx !== -1) {
            listCopy[idx].status = newStatus;
            listCopy[idx].updatedAt = new Date().toISOString();
          }
        });
        await batch.commit();
      }

      setFounders(listCopy);
      setSelectedIds([]);
      showSuccess(`Marked ${selectedIds.length} target founders as '${newStatus}'`);
    } catch (err) {
      console.error("Bulk status error:", err);
      showError("Failed to update status in bulk.");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    showConfirm(
      "Delete Selected Founders?",
      `Are you sure you want to delete all ${selectedIds.length} selected target founders? This action is permanent.`,
      async () => {
        try {
          setBulkActionLoading(true);
          const batchSize = 100;
          let listCopy = [...founders];

          for (let i = 0; i < selectedIds.length; i += batchSize) {
            const chunk = selectedIds.slice(i, i + batchSize);
            const batch = writeBatch(db);
            chunk.forEach(id => {
              batch.delete(doc(db, "founders", id));
              listCopy = listCopy.filter(f => f.id !== id);
            });
            await batch.commit();
          }

          setFounders(listCopy);
          setSelectedIds([]);
          showSuccess("Selected founders deleted.");
        } catch (err) {
          console.error("Bulk delete error:", err);
          showError("Failed to delete selected targets.");
        } finally {
          setBulkActionLoading(false);
        }
      },
      true,
      "Delete All"
    );
  };

  // Function to shoot emails to all (or selected) founders at once
  const handleShootAllEmails = (shootOnlySelected: boolean) => {
    const targets = shootOnlySelected 
      ? filteredFounders.filter(f => selectedIds.includes(f.id)) 
      : filteredFounders;

    if (targets.length === 0) {
      showError(shootOnlySelected ? "Please select at least one founder from the table to shoot emails." : "No founders available in the current filtered list.");
      return;
    }

    const titleText = gmailAccessToken ? "Shoot REAL Emails via Gmail? 🚀" : "Shoot Outreach Emails?";
    const confirmMessage = gmailAccessToken
      ? `You have connected your Gmail account (${gmailUserEmail}). This will send ${targets.length} ACTUAL, personalized outreach emails directly from your inbox to your target founders. Are you sure?`
      : `Are you sure you want to shoot personalized outreach emails to all ${targets.length} targets? This will run the simulated delivery engine. (Tip: Connect your Gmail inbox to send real emails!)`;

    showConfirm(
      titleText,
      confirmMessage,
      async () => {
        try {
          isShootCancelled.current = false;
          setIsCampaignSending(true);
          setIsShootingAll(true);
          
          const verifiedCount = targets.filter(f => f.verificationStatus === "Verified").length;
          const initialLogs = [
            gmailAccessToken 
              ? `Initializing Direct Gmail SMTP/API Bulk Session...` 
              : `Initializing SMTP Bulk Sender Session (Simulation)...`,
            `Target list: ${targets.length} founders.`
          ];
          
          if (onlyVerifiedEmails) {
            initialLogs.push(`🛡️ Filter Enabled: Only sending to verified emails. ${targets.length - verifiedCount} unverified leads will be skipped to protect your sender reputation.`);
          }
          
          setShootProgress({ current: 0, total: targets.length, success: 0, failed: 0 });
          setShootLogs(initialLogs);

          const updatedFounders = [...founders];
          let currentSuccessCount = 0;
          let currentFailedCount = 0;

          if (gmailAccessToken) {
            // Sequential real Gmail sending with 500ms intervals
            for (let i = 0; i < targets.length; i++) {
              if (isShootCancelled.current) {
                setShootLogs(prev => [
                  ...prev,
                  `🛑 STOPPED: Bulk campaign aborted by user. Succeeded: ${currentSuccessCount}, Failed: ${currentFailedCount}`
                ]);
                break;
              }

              const founder = targets[i];

              if (onlyVerifiedEmails && founder.verificationStatus !== "Verified") {
                setShootLogs(prev => [
                  ...prev,
                  `⚠️ SKIPPED: ${founder.name} (${founder.company}) - Contact email is not verified.`
                ]);
                setShootProgress(prev => ({
                  ...prev,
                  current: i + 1
                }));
                continue;
              }

              const resolved = resolveTemplate(templateSubject, templateBody, founder);
              const subject = founder.personalizedSubject || resolved.subject;
              const body = founder.personalizedEmail || resolved.body;

              try {
                await sendGmailEmail(founder.email, subject, body, gmailAccessToken);
                currentSuccessCount++;
                
                // Update Firestore
                try {
                  await updateDoc(doc(db, "founders", founder.id), safeFirestoreData({
                    status: "Sent",
                    personalizedSubject: subject,
                    personalizedEmail: body,
                    updatedAt: new Date().toISOString()
                  }));
                } catch (dbErr) {
                  console.warn(`Database sync warning for ${founder.name} (email sent successfully):`, dbErr);
                }

                // Update local copy
                const idx = updatedFounders.findIndex(f => f.id === founder.id);
                if (idx !== -1) {
                  updatedFounders[idx] = {
                    ...updatedFounders[idx],
                    status: "Sent",
                    personalizedSubject: subject,
                    personalizedEmail: body,
                    updatedAt: new Date().toISOString()
                  };
                }

                setShootLogs(prev => [
                  ...prev,
                  `✅ SENT: ${founder.name} (${founder.company}) - Real email delivered successfully via Gmail!`
                ]);
              } catch (err: any) {
                console.error(`Gmail Send Error for ${founder.name}:`, err);
                currentFailedCount++;

                // Update Firestore with Failed status
                try {
                  await updateDoc(doc(db, "founders", founder.id), safeFirestoreData({
                    status: "Failed",
                    personalizedSubject: subject,
                    personalizedEmail: body,
                    updatedAt: new Date().toISOString()
                  }));
                } catch (dbErr) {
                  console.warn(`Database sync warning on fail for ${founder.name}:`, dbErr);
                }

                // Update local copy
                const idx = updatedFounders.findIndex(f => f.id === founder.id);
                if (idx !== -1) {
                  updatedFounders[idx] = {
                    ...updatedFounders[idx],
                    status: "Failed",
                    personalizedSubject: subject,
                    personalizedEmail: body,
                    updatedAt: new Date().toISOString()
                  };
                }

                setShootLogs(prev => [
                  ...prev,
                  `❌ FAILED: ${founder.name} (${founder.company}) - Gmail API Error: ${err.message || "Rejected"}`
                ]);
              }

              setShootProgress(prev => ({
                ...prev,
                current: i + 1,
                success: currentSuccessCount,
                failed: currentFailedCount
              }));

              // 500ms spacing to respect rate-limiting and keep progress smooth
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } else {
            // Simulate sending in chunks of 100
            const batchSize = 100;
            for (let i = 0; i < targets.length; i += batchSize) {
              if (isShootCancelled.current) {
                setShootLogs(prev => [
                  ...prev,
                  `🛑 STOPPED: Bulk campaign aborted by user. Succeeded: ${currentSuccessCount}, Failed: ${currentFailedCount}`
                ]);
                break;
              }

              const chunk = targets.slice(i, i + batchSize);
              const batch = writeBatch(db);
              const activeChunk: Founder[] = [];

              chunk.forEach((founder) => {
                if (onlyVerifiedEmails && founder.verificationStatus !== "Verified") {
                  setShootLogs(prev => [
                    ...prev,
                    `⚠️ SKIPPED: ${founder.name} (${founder.company}) - Contact email is not verified.`
                  ]);
                  return;
                }
                activeChunk.push(founder);
              });

              if (activeChunk.length > 0) {
                activeChunk.forEach((founder) => {
                  const isSuccessful = Math.random() > 0.08;
                  const finalStatus: Founder["status"] = isSuccessful ? "Sent" : "Failed";
                  const resolved = resolveTemplate(templateSubject, templateBody, founder);

                  if (isSuccessful) {
                    currentSuccessCount++;
                  } else {
                    currentFailedCount++;
                  }

                  batch.update(doc(db, "founders", founder.id), {
                    status: finalStatus,
                    personalizedSubject: founder.personalizedSubject || resolved.subject,
                    personalizedEmail: founder.personalizedEmail || resolved.body,
                    updatedAt: new Date().toISOString()
                  });

                  const idx = updatedFounders.findIndex(f => f.id === founder.id);
                  if (idx !== -1) {
                    updatedFounders[idx] = {
                      ...updatedFounders[idx],
                      status: finalStatus,
                      personalizedSubject: updatedFounders[idx].personalizedSubject || resolved.subject,
                      personalizedEmail: updatedFounders[idx].personalizedEmail || resolved.body,
                      updatedAt: new Date().toISOString()
                    };
                  }
                });

                await batch.commit();

                const newLogs: string[] = [];
                activeChunk.forEach((founder) => {
                  const matchedFounder = updatedFounders.find(f => f.id === founder.id);
                  const isSuccessful = matchedFounder?.status === "Sent";
                  const resolved = resolveTemplate(templateSubject, templateBody, founder);
                  const emailLog = isSuccessful
                    ? `✅ DELIVERED: ${founder.name} (${founder.company}) - Subject: "${founder.personalizedSubject || resolved.subject}"`
                    : `❌ BOUNCED: ${founder.name} (${founder.company}) - Mailbox delivery failed (SMTP bounce)`;
                  newLogs.push(emailLog);
                });

                setShootLogs(prev => [...prev, ...newLogs]);
              }

              setShootProgress(prev => ({
                ...prev,
                current: Math.min(i + batchSize, targets.length),
                success: currentSuccessCount,
                failed: currentFailedCount
              }));

              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }

          setFounders(updatedFounders);
          setSelectedIds([]);
          
          if (isShootCancelled.current) {
            setShootLogs(prev => [
              ...prev,
              `⚠️ Session halted. Succeeded: ${currentSuccessCount}, Failed: ${currentFailedCount}`
            ]);
            showSuccess(`Outreach stopped! Processed: ${currentSuccessCount} sent successfully.`);
          } else {
            setShootLogs(prev => [
              ...prev,
              `🎉 ${gmailAccessToken ? "Gmail campaign" : "Simulated bulk session"} completed! Sent: ${currentSuccessCount}, Failed: ${currentFailedCount}`
            ]);
            showSuccess(`Outreach completed! Sent: ${currentSuccessCount}, Failed: ${currentFailedCount}`);
          }
        } catch (err: any) {
          console.error("Bulk shoot error:", err);
          setShootLogs(prev => [...prev, `🚨 CRITICAL ERROR: Connection issue during batch execution.`]);
          showError("Outreach delivery ran into an error. Some emails may not have gone through.");
        } finally {
          setIsCampaignSending(false);
        }
      },
      false,
      gmailAccessToken ? "Send Real Emails ✉️" : "Shoot Emails 🚀"
    );
  };

  // Unique Sectors for Filters
  const uniqueSectors = useMemo(() => {
    const set = new Set<string>();
    founders.forEach(f => {
      if (f.sector) set.add(f.sector);
    });
    return ["All", ...Array.from(set).slice(0, 10)]; // show top 10 unique
  }, [founders]);

  // Filter Logic
  const filteredFounders = useMemo(() => {
    return founders.filter(f => {
      const q = search.toLowerCase();
      const matchesSearch = 
        f.name.toLowerCase().includes(q) ||
        f.company.toLowerCase().includes(q) ||
        (f.sector && f.sector.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "All" || f.status === statusFilter;
      const matchesSector = sectorFilter === "All" || f.sector === sectorFilter;

      let matchesVerification = true;
      if (verificationFilter === "Verified") {
        matchesVerification = f.verificationStatus === "Verified";
      } else if (verificationFilter === "Unverified") {
        matchesVerification = !f.verificationStatus || f.verificationStatus === "Pending";
      } else if (verificationFilter === "NotFound") {
        matchesVerification = f.verificationStatus === "Not Found";
      }

      return matchesSearch && matchesStatus && matchesSector && matchesVerification;
    });
  }, [founders, search, statusFilter, sectorFilter, verificationFilter]);

  // Paginated List
  const totalRows = filteredFounders.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedList = useMemo(() => {
    return filteredFounders.slice(
      (currentPage - 1) * rowsPerPage,
      currentPage * rowsPerPage
    );
  }, [filteredFounders, currentPage, rowsPerPage]);

  // Live Statistics Calculations
  const stats = useMemo(() => {
    const total = founders.length;
    const drafts = founders.filter(f => f.status === "Draft").length;
    const sent = founders.filter(f => f.status === "Sent").length;
    const replied = founders.filter(f => f.status === "Replied").length;
    const failed = founders.filter(f => f.status === "Failed").length;
    return { total, drafts, sent, replied, failed };
  }, [founders]);

  // Copy Single Resolved Message
  const handleCopyPitch = async (founder: Founder, resolvedSubject: string, resolvedBody: string) => {
    const finalSubject = founder.personalizedSubject || resolvedSubject;
    const finalBody = founder.personalizedEmail || resolvedBody;
    const plainText = `Subject: ${finalSubject}\n\n${finalBody}`;

    // Create rich HTML content where "Radhey" or "Radhey Mohan Mishra" are real hyperlinks
    const escapedSubject = finalSubject.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const escapedBody = finalBody.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // Replace "Suraj Sharma" first, then "Suraj"
    let htmlBody = escapedBody.replace(/\n/g, "<br>");
    htmlBody = htmlBody.replace(/Suraj Sharma/g, '<a href="https://www.linkedin.com/in/surya-07-sharma/" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">Suraj Sharma</a>');
    htmlBody = htmlBody.replace(/Suraj/g, '<a href="https://www.linkedin.com/in/surya-07-sharma/" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">Suraj</a>');

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
      setCopiedId(founder.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Rich copy failed, falling back to plain text:", err);
      try {
        await navigator.clipboard.writeText(plainText);
        setCopiedId(founder.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (fallbackErr) {
        console.error("Fallback copy failed too:", fallbackErr);
      }
    }
  };

  // Generate mailto link for a founder
  const getMailtoUrl = (founder: Founder, resolvedSubject: string, resolvedBody: string) => {
    const subject = founder.personalizedSubject || resolvedSubject;
    const body = founder.personalizedEmail || resolvedBody;
    return `mailto:${encodeURIComponent(founder.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Multi-selection Handlers
  const handleToggleSelectAll = () => {
    const pageIds = paginatedList.map(f => f.id);
    const allSelectedOnPage = pageIds.every(id => selectedIds.includes(id));
    if (allSelectedOnPage) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const union = new Set([...prev, ...pageIds]);
        return Array.from(union);
      });
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (!user && !isDemoUser) {
    return (
      <div id="auth-root" className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans flex flex-col justify-between">
        {/* Landing Page Navbar */}
        <header className="max-w-7xl mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-between border-b border-slate-200/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                Founder Outreach Studio
              </h1>
              <p className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">
                Firebase Connected Outreach Engine
              </p>
            </div>
          </div>
          <div className="text-xs font-mono bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            redjim.com Firebase Linked
          </div>
        </header>

        {/* Landing Page Hero and Auth Card */}
        <main className="max-w-4xl mx-auto w-full px-4 py-12 flex flex-col md:flex-row items-center gap-12 flex-1 justify-center">
          <div className="flex-1 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 bg-indigo-100/60 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
              <Database className="w-3.5 h-3.5" />
              Secure Firestore Integration
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
              Automate &amp; Track <br/>
              <span className="text-indigo-600">900 Startup Founders</span> Outreach in One Simple Place.
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-lg">
              Craft personal connections, write authentic templates resolving Cerebral Palsy grit, and manage your 900 target SaaS &amp; EdTech founders directly connected to the Firestore cloud database.
            </p>
            
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Firebase Connection Active
              </h4>
              <p className="text-xs text-slate-500">
                All contacts, outreach campaigns, templates, and statuses are synced live using high-availability cloud rules. Your user login session is fully secured.
              </p>
            </div>
          </div>

          {/* Authentication Card */}
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600"></div>
            
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">
                {authMode === "login" ? "Sign In" : authMode === "signup" ? "Create Account" : "Reset Password"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {authMode === "login" 
                  ? "Access your dashboard connected to Firebase" 
                  : authMode === "signup" 
                  ? "Register secure credentials" 
                  : "We'll email a secure password reset link"}
              </p>
            </div>

            {/* Google Sign-In Option */}
            {authMode !== "reset" && (
              <div className="space-y-4">
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full py-2.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="flex items-center">
                  <hr className="flex-1 border-slate-100" />
                  <span className="px-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">OR EMAIL</span>
                  <hr className="flex-1 border-slate-100" />
                </div>
              </div>
            )}

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="flex-1 text-left">{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-semibold flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="flex-1 text-left">{authSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 text-left">Email Address</label>
                <input 
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400"
                  placeholder="radheymohanmishra13@gmail.com"
                />
              </div>

              {authMode !== "reset" && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                    {authMode === "login" && (
                      <button 
                        type="button"
                        onClick={() => { setAuthMode("reset"); setAuthError(""); setAuthSuccess(""); }}
                        className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input 
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {authLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : authMode === "login" ? (
                  "Sign In Securely"
                ) : authMode === "signup" ? (
                  "Register Account"
                ) : (
                  "Send Reset Email"
                )}
              </button>
            </form>

            <div className="border-t border-slate-100 pt-4 flex flex-col gap-2.5 text-center text-xs">
              {authMode === "login" ? (
                <p className="text-slate-500">
                  New to Outreach Studio?{" "}
                  <button 
                    onClick={() => { setAuthMode("signup"); setAuthError(""); setAuthSuccess(""); }}
                    className="font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Create an account
                  </button>
                </p>
              ) : (
                <p className="text-slate-500">
                  Already have an account?{" "}
                  <button 
                    onClick={() => { setAuthMode("login"); setAuthError(""); setAuthSuccess(""); }}
                    className="font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Sign in here
                  </button>
                </p>
              )}

              <div className="flex items-center my-1.5">
                <hr className="flex-1 border-slate-100" />
                <span className="px-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">OR</span>
                <hr className="flex-1 border-slate-100" />
              </div>

              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200/50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Instant Developer Demo Login</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div id="workspace-root" className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Streamlined Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/60 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-sm">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                  Outreach Studio
                </h1>
                <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
                  Multi-Channel Email &amp; LinkedIn Campaign Mixer
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Define dynamic templates, import leads via CSV/TSV, and run outreach campaigns over Gmail and LinkedIn. Personalization tags resolve live for each prospect.
            </p>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Workspace</span>
              <span className="text-xs font-extrabold text-slate-800">{workspaceEmail || gmailUserEmail || user?.email || "Not signed in"}</span>
            </div>

            {!showOnboarding && (
              <button
                onClick={() => {
                  setShowOnboarding(true);
                  localStorage.removeItem("show_onboarding_guide");
                }}
                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Setup Guide
              </button>
            )}

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mb-6 bg-white p-1 rounded-xl shadow-2xs gap-1">
          <button
            onClick={() => setActiveTab("email")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "email"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email Campaigns</span>
          </button>
          <button
            onClick={() => setActiveTab("linkedin")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "linkedin"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Linkedin className="w-4 h-4" />
            <span>LinkedIn Pitching</span>
          </button>
          <button
            onClick={() => setActiveTab("discover")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "discover"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Find Leads</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "profile"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Pitch Profile</span>
          </button>
        </div>

        {/* Tab content router */}
        {activeTab === "email" && (
          <EmailTab
            founders={founders}
            setFounders={setFounders}
            loading={loading}
            stats={stats}
            gmailAccessToken={gmailAccessToken}
            gmailUserEmail={gmailUserEmail}
            isConnectingGmail={isConnectingGmail}
            handleConnectGmail={handleConnectGmail}
            handleDisconnectGmail={handleDisconnectGmail}
            templateSubject={templateSubject}
            setTemplateSubject={setTemplateSubject}
            templateBody={templateBody}
            setTemplateBody={setTemplateBody}
            resolveTemplate={resolveTemplate}
            handleSendGmailInstantly={handleSendGmailInstantly}
            handleCopyPitch={handleCopyPitch}
            handleDeleteFounder={handleDeleteFounder}
            handleUpdateStatus={handleUpdateStatus}
            handleToggleExpandRow={handleToggleExpandRow}
            expandedFounderId={expandedFounderId}
            renderEmailBody={renderEmailBody}
            isQuickPasteOpen={isQuickPasteOpen}
            setIsQuickPasteOpen={setIsQuickPasteOpen}
            bulkCsvInput={bulkCsvInput}
            setBulkCsvInput={setBulkCsvInput}
            csvImportStatus={csvImportStatus}
            setCsvImportStatus={setCsvImportStatus}
            handleBulkCsvImport={handleBulkCsvImport}
            isCsvImporting={isCsvImporting}
            handleResetSentFailed={handleResetSentFailed}
            handleDeleteSentFailed={handleDeleteSentFailed}
            handleInstantRestore500={handleInstantRestore500}
            preseededFounders={preseededFounders}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            handleBatchApplyTemplate={handleBatchApplyTemplate}
            handleBatchShootSelectedAPI={() => handleShootAllEmails(true)}
            handleBatchDeleteSelected={handleBulkDelete}
            setAddModalOpen={setIsAddModalOpen}
            profile={profile}
            showOnboarding={showOnboarding}
            setShowOnboarding={setShowOnboarding}
          />
        )}

        {activeTab === "linkedin" && (
          <LinkedInTab
            founders={founders}
            setFounders={setFounders}
            templateLinkedIn={templateLinkedIn}
            setTemplateLinkedIn={setTemplateLinkedIn}
            resolveTemplate={resolveTemplate}
            showSuccess={showSuccess}
            showError={showError}
          />
        )}

        {activeTab === "discover" && (
          <DiscoverTab
            discoverTab={discoverTab}
            setDiscoverTab={setDiscoverTab}
            discoverNiche={discoverNiche}
            setDiscoverNiche={setDiscoverNiche}
            selectedLocalDiscoverIds={selectedLocalDiscoverIds}
            setSelectedLocalDiscoverIds={setSelectedLocalDiscoverIds}
            localDiscoverMatches={localDiscoverMatches}
            handleImportLocalDiscoverLeads={handleImportLocalDiscoverLeads}
            loading={loading}
            preseededFounders={preseededFounders}
            isDiscovering={isDiscovering}
            discoveredLeads={discoveredLeads}
            handleDiscoverFounders={handleDiscoverFounders}
            selectedDiscoverIds={selectedDiscoverIds}
            setSelectedDiscoverIds={setSelectedDiscoverIds}
            handleImportChecked={handleImportChecked}
          />
        )}

        {activeTab === "profile" && (
          <ProfileTab
            profile={profile}
            onSave={handleSaveProfile}
            onReset={() => {
              setProfile({
                name: "Suraj",
                bio: `Hi, I'm reaching out because I genuinely want to work with you and contribute to what you're building. I started building and figuring things out at 8, long before startups became a trend. Over the last 5+ years, I've worked across Product, Founder's Office, and Design in startups, not because I couldn't pick one lane, but because I love understanding the full picture and solving whatever the actual problem is. I also founded an EdTech startup. It failed. But that taught me more about building, distribution, and resilience than anything else could have. What I love most is taking things from 0 to 1, the messy, no-playbook phase where you just have to figure it out. That's where I'm most alive. On a personal note, I have lived with Cerebral Palsy my entire life. Every small thing that most people do without thinking has been a quiet battle for me. But fighting those battles every single day built something deep, with persistence, resilience, and an absolute refusal to quit. That's not a weakness I overcame. That's who I am. That's my answer to why me. I learn fast, take ownership, and I care deeply about what I'm building.`,
                experience: "5+ Years across Product, Founder's Office, Design, and EdTech Founder",
                additionalContext: "Targeting early-stage Indian founders who appreciate resilience, high-ownership, and versatile building.",
                emailSignature: "Best,\nSuraj"
              });
            }}
          />
        )}

      </div>

      {/* Add Custom Founder Modal */}
      {isAddModalOpen && (
        <AddFounderModal 
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddFounder}
        />
      )}

      {/* Real-time SMTP Bulk Sender Session Monitor Modal */}
      {isShootingAll && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20 animate-pulse">
                  <Send className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">SMTP Bulk Outreach Session</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Bulk email delivery engine with persistent Firestore status tracking</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isCampaignSending ? (
                  <span className={`px-2 py-0.5 text-[10px] font-black rounded-full border ${
                    shootProgress.current === shootProgress.total 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    {shootProgress.current === shootProgress.total ? "COMPLETED" : "STOPPED / HALTED"}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 text-[10px] font-black rounded-full border border-rose-500/20 animate-pulse">
                    SENDING LIVE...
                  </span>
                )}
              </div>
            </div>

            {/* Stats Counter Row */}
            <div className="grid grid-cols-4 border-b border-slate-800/80 text-center bg-slate-950/50">
              <div className="p-4 border-r border-slate-800/80">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Queue Total</p>
                <p className="text-lg font-black text-white mt-1">{shootProgress.total}</p>
              </div>
              <div className="p-4 border-r border-slate-800/80">
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">Processed</p>
                <p className="text-lg font-black text-slate-300 mt-1">{shootProgress.current}</p>
              </div>
              <div className="p-4 border-r border-slate-800/80">
                <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">✅ Succeeded</p>
                <p className="text-lg font-black text-emerald-400 mt-1">{shootProgress.success}</p>
              </div>
              <div className="p-4">
                <p className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">❌ Failed / Bounced</p>
                <p className="text-lg font-black text-rose-400 mt-1">{shootProgress.failed}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-slate-900 w-full">
              <div 
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: `${(shootProgress.current / (shootProgress.total || 1)) * 100}%` }}
              ></div>
            </div>

            {/* Terminal Logs */}
            <div className="flex-1 p-5 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1.5 bg-slate-950/90 text-slate-300 min-h-[250px] max-h-[350px] text-left">
              {shootLogs.map((log, idx) => {
                let colorClass = "text-slate-300";
                if (log.startsWith("✅")) colorClass = "text-emerald-400 font-semibold";
                else if (log.startsWith("❌")) colorClass = "text-rose-400 font-semibold";
                else if (log.startsWith("🚨")) colorClass = "text-red-500 font-bold";
                else if (log.startsWith("🎉")) colorClass = "text-yellow-400 font-bold";
                return (
                  <div key={idx} className={`${colorClass} whitespace-pre-wrap`}>
                    {log}
                  </div>
                );
              })}
            </div>

            {/* Footer controls */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/40 flex items-center justify-end gap-3">
              <p className="text-[10px] text-slate-400 italic mr-auto">
                Do not refresh this tab while campaign is live.
              </p>

              {isCampaignSending && (
                <button
                  onClick={() => {
                    isShootCancelled.current = true;
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer animate-pulse"
                >
                  🛑 Stop Campaign
                </button>
              )}

              <button
                onClick={() => {
                  setIsShootingAll(false);
                  setShootLogs([]);
                }}
                disabled={isCampaignSending}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close Monitor
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl shrink-0 ${confirmModal.isDanger ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1 text-left">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">{confirmModal.title}</h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {confirmModal.cancelText || "Cancel"}
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer ${
                  confirmModal.isDanger 
                    ? 'bg-rose-600 hover:bg-rose-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {confirmModal.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
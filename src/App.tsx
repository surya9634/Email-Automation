import React, { useEffect, useState, useMemo } from "react";
import { 
  Search, Plus, Copy, ExternalLink, Trash2, RefreshCw, 
  AlertCircle, CheckCircle, ChevronLeft, ChevronRight, 
  Mail, Users, CheckSquare, Square, Sparkles, Layers, 
  Database, Award, Send, CheckCircle2, ChevronDown, LogOut,
  Linkedin
} from "lucide-react";
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut, 
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithRedirect,
  linkWithRedirect,
  getRedirectResult
} from "firebase/auth";
import { db, auth } from "./firebase";
import { Founder } from "./types";
import { preseededFounders } from "./preseededFounders";
import AddFounderModal from "./components/AddFounderModal";

const DEFAULT_SUBJECT = "Want to work with [Company] | Why Me?";
const DEFAULT_BODY = `Hi [Name],

I'm reaching out because I genuinely want to work with you and contribute to what you're building at [Company] & your journey from a long time. 

You probably have one question reading this, why me only?

I started building and figuring things out at 8, long before startups became a trend. Over the last 5+ years, I've worked across Product, Founder's Office, and Design in startups, not because I couldn't pick one lane, but because I love understanding the full picture and solving whatever the actual problem is.

I also founded an EdTech startup. It failed. But that taught me more about building, distribution, and resilience than anything else could have.

What I love most is taking things from 0 to 1,the messy, no-playbook phase where you just have to figure it out. That's where I'm most alive.

On a personal note, I have lived with Cerebral Palsy my entire life. Every small thing that most people do without thinking has been a quiet battle for me. But fighting those battles every single day built something deep, with persistence, resilience, and an absolute refusal to quit. That's not a weakness I overcame. That's who I am.

That's my answer to why me. I learn fast, take ownership, and I care deeply about what I'm building.

If there's any opportunity right now to contribute and grow alongside your team. I'd be really grateful for the chance to work with you! You won't regret the decision of giving this 16 year old a chance.

Best,
Suraj`;

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
    return localStorage.getItem("workspace_email") || "surajsharma963472@gmail.com";
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

  const [founders, setFounders] = useState<Founder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
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

  // Handle Firebase redirect results (for Google Sign-In and Gmail connection)
  useEffect(() => {
    async function handleRedirectResult() {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          
          // Case 1: Google Sign-in redirect result
          if (result.user.email) {
            setWorkspaceEmail(result.user.email);
            localStorage.setItem("workspace_email", result.user.email);
          }

          // Case 2: Gmail link/scope redirect result
          if (credential?.accessToken) {
            setGmailAccessToken(credential.accessToken);
            setGmailUserEmail(result.user.email || "");
            sessionStorage.setItem("gmail_access_token", credential.accessToken);
            sessionStorage.setItem("gmail_user_email", result.user.email || "");
            showSuccess(`Successfully connected Gmail: ${result.user.email}`);
          } else {
            showSuccess("Signed in with Google successfully!");
          }
        }
      } catch (err: any) {
        console.error("Redirect auth error:", err);
        let msg = "Google authentication failed. Please try again.";
        if (err.code === "auth/popup-blocked") {
          msg = "The Google sign-in popup was blocked by your browser. Please enable popups or try the Email option.";
        } else if (err.code === "auth/popup-closed-by-user") {
          msg = "Google sign-in window was closed before completion.";
        } else if (err.code === "auth/credential-already-in-use" || err.code === "auth/email-already-in-use") {
          msg = "This Google account is already linked to another profile in your Firebase project. Please sign out and sign in with Google directly.";
        }
        setAuthError(msg);
        showError(msg);
      }
    }
    handleRedirectResult();
  }, []);

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
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setAuthError("Google authentication initiation failed. Please try again.");
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
        .replace(/Radhey Mohan Mishra/g, '<a href="https://www.linkedin.com/in/radheymohanmishra/" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">Radhey Mohan Mishra</a>')
        .replace(/\bRadhey\b/g, '<a href="https://www.linkedin.com/in/radheymohanmishra/" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">Radhey</a>');
      
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

      if (auth.currentUser) {
        try {
          await linkWithRedirect(auth.currentUser, provider);
        } catch (linkErr: any) {
          console.log("linkWithRedirect failed, falling back to signInWithRedirect", linkErr);
          await signInWithRedirect(auth, provider);
        }
      } else {
        await signInWithRedirect(auth, provider);
      }
    } catch (err: any) {
      console.error("Gmail connect error:", err);
      showError("Gmail connection was interrupted or failed. Please try again.");
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
      const lines = bulkCsvInput.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      const newFoundersList: Founder[] = [];
      const timestamp = new Date().toISOString();

      lines.forEach((line) => {
        // format could be: "Name, email@domain.com, Company, Sector"
        // or just "email@domain.com"
        const parts = line.split(/[,;\t]/).map(p => p.trim());
        
        let name = "Founder";
        let email = "";
        let company = "SaaS Startup";
        let sector = "SaaS";
        let context = "Imported from email list";

        if (parts.length >= 2) {
          if (parts[0].includes("@")) {
            email = parts[0];
            name = parts[1] || "Founder";
          } else {
            name = parts[0];
            email = parts[1].includes("@") ? parts[1] : parts[0].toLowerCase().replace(/[^a-z0-9]/g, "") + "@testcompany.com";
          }
          
          if (parts[2]) company = parts[2];
          if (parts[3]) sector = parts[3];
          if (parts[4]) context = parts[4];
        } else {
          email = parts[0];
          if (email.includes("@")) {
            const handle = email.split("@")[0];
            name = handle.charAt(0).toUpperCase() + handle.slice(1);
            company = email.split("@")[1].split(".")[0].toUpperCase();
          } else {
            name = email;
            email = name.toLowerCase().replace(/[^a-z0-9]/g, "") + "@testcompany.com";
          }
        }

        const generatedId = company.toLowerCase().replace(/[^a-z0-9]/g, "") + "-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

        newFoundersList.push({
          id: generatedId,
          name,
          company,
          sector,
          email,
          context,
          status: csvImportStatus,
          createdAt: timestamp,
          updatedAt: timestamp
        });
      });

      if (newFoundersList.length === 0) {
        showError("No valid targets could be parsed from your input.");
        setIsCsvImporting(false);
        return;
      }

      // Add to Firestore in chunks
      const batchSize = 100;
      for (let i = 0; i < newFoundersList.length; i += batchSize) {
        const chunk = newFoundersList.slice(i, i + batchSize);
        const batch = writeBatch(db);
        chunk.forEach(f => {
          batch.set(doc(db, "founders", f.id), f);
        });
        await batch.commit();
      }

      setFounders(prev => [...newFoundersList, ...prev]);
      setBulkCsvInput("");
      showSuccess(`Successfully imported ${newFoundersList.length} founders to status '${csvImportStatus}' at once!`);
    } catch (err) {
      console.error("Bulk CSV import error:", err);
      showError("Failed to import CSV dataset. Verify connection.");
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
    const s = subjectTemplate
      .replace(/\[Name\]/g, firstName)
      .replace(/\[Company\]/g, f.company)
      .replace(/\[Sector\]/g, f.sector);
    const b = bodyTemplate
      .replace(/\[Name\]/g, firstName)
      .replace(/\[Company\]/g, f.company)
      .replace(/\[Sector\]/g, f.sector);
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

        {/* Landing Page Footer */}
        <footer className="bg-slate-100 border-t border-slate-200/60 py-6 text-center text-[11px] text-slate-400">
          <div className="max-w-7xl mx-auto px-4">
            Outreach Studio connected dynamically to redjim.com Firebase Auth &amp; Cloud Firestore database.
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div id="workspace-root" className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Streamlined Simple Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/60 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                  Founder Outreach Studio
                </h1>
                <p className="text-xs font-semibold text-indigo-600 tracking-wider uppercase">
                  Simple Single-Screen Directory &amp; Template Mixer
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Define your master template and manage all {preseededFounders.length} target founders in one clean directory. Customize content with dynamic placeholders and easily track outreach.
            </p>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Workspace</span>
              <span className="text-xs font-extrabold text-slate-800">{workspaceEmail || "Demo Session"}</span>
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

        {/* Onboarding Tutorial: How to Set Up and Send Your First Email */}
        {showOnboarding && (
          <div className="mb-8 bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-50 border-2 border-indigo-200/60 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden animate-in fade-in slide-in-from-top-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-200/20 rounded-full blur-xl"></div>
            
            <button 
              onClick={() => {
                setShowOnboarding(false);
                localStorage.setItem("show_onboarding_guide", "false");
              }}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              title="Dismiss Tutorial"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shrink-0 hidden sm:block">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-black text-indigo-950 flex items-center gap-2 uppercase tracking-wider">
                    🚀 Onboarding Walkthrough: Setup Mail for 1 Email
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Welcome! We have replaced the 200 demo contacts with a clean setup tutorial. Here is how to configure, personalize, and send your first cold email using your email (<strong>surajsharma963472@gmail.com</strong>) as a test case:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                  <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/60">
                    <div className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mb-2 font-mono">STEP 1</div>
                    <h4 className="text-xs font-extrabold text-slate-800">Verify Tutorial Target</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      We have preloaded exactly 1 walkthrough lead in the directory below: <strong>Suraj Sharma</strong> with email <strong>surajsharma963472@gmail.com</strong>.
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/60">
                    <div className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mb-2 font-mono">STEP 2</div>
                    <h4 className="text-xs font-extrabold text-slate-800">Connect Gmail Inbox</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Scroll to the <strong>Gmail Outreach Engine</strong> section and click <strong>Connect Gmail Inbox</strong> to link your Google workspace.
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/60">
                    <div className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mb-2 font-mono">STEP 3</div>
                    <h4 className="text-xs font-extrabold text-slate-800">Mix &amp; Personalize</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Check the box next to Suraj's name. In the <strong>Template Mixer</strong>, customize your pitch and click <strong>Save Template for Selected</strong>.
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/60">
                    <div className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mb-2 font-mono">STEP 4</div>
                    <h4 className="text-xs font-extrabold text-slate-800">Send Safely</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Click the row's <strong>Gmail</strong> / <strong>Mailto</strong> icon to open a compose screen, or select the lead and click <strong>Shoot Selected</strong> to send directly via API!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Metric Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Targets", value: stats.total, icon: Users, color: "text-indigo-600 bg-indigo-50 border-indigo-100/60" },
            { label: "Emails Sent", value: stats.sent, icon: Send, color: "text-blue-600 bg-blue-50 border-blue-100/60" },
            { label: "Replies Received", value: stats.replied, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-100/60" },
            { label: "Bounced / Failed", value: stats.failed, icon: AlertCircle, color: "text-rose-600 bg-rose-50 border-rose-100/60" }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 shadow-2xs hover:shadow-xs transition-all duration-200">
                <div className={`p-2.5 rounded-xl border ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                  <p className="text-xl font-black text-slate-800 mt-0.5">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alerts / Notices */}
        {(stats.sent > 0 || stats.failed > 0) && (
          <div className="mb-6 p-5 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                  Wasted some outreach emails?
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  You have <span className="font-extrabold text-rose-700">{stats.sent + stats.failed}</span> emails currently sent or failed. You can either bring them back to <span className="font-bold text-slate-800">Draft</span> status, or permanently <span className="font-bold text-rose-700">Delete</span> them so they are removed from your active workspace and cannot be re-sent.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <button
                onClick={handleResetSentFailed}
                disabled={loading}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Bring back to Draft 🚀
              </button>
              <button
                onClick={handleDeleteSentFailed}
                disabled={loading}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:bg-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Permanently Delete Sent Leads 🗑️
              </button>
            </div>
          </div>
        )}

        {stats.total < preseededFounders.length && (
          <div className="mb-6 p-5 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                  Missing {preseededFounders.length} Preseeded Founder Leads?
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  You currently have only <span className="font-extrabold text-indigo-700">{stats.total}</span> leads in your active database. Click the button to instantly import and restore the full, pristine database of <span className="font-extrabold text-indigo-700">{preseededFounders.length} preseeded, new-age Indian founders</span> who have raised initial-phase capital.
                </p>
              </div>
            </div>
            <button
              onClick={handleInstantRestore500}
              disabled={loading}
              className="shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4.5 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:bg-indigo-400"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Bring back {preseededFounders.length} Leads 🚀
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} className="hover:underline text-[10px] font-bold cursor-pointer">Dismiss</button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="flex-1">{successMsg}</span>
            <button onClick={() => setSuccessMsg("")} className="hover:underline text-[10px] font-bold cursor-pointer">Dismiss</button>
          </div>
        )}

        {/* Bulk loading progress bar */}
        {bulkActionLoading && (
          <div className="mb-6 p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                Bulk action in progress...
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                {bulkProgress.total > 0 ? `${bulkProgress.current} / ${bulkProgress.total}` : "Synchronizing..."}
              </span>
            </div>
            {bulkProgress.total > 0 && (
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                ></div>
              </div>
            )}
          </div>
        )}

        {/* Main Interface Layout - Master Template + Founder Place */}
        <div className="space-y-8">
          
          {/* Section 1: One Master Subject & Content Template Mixer */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">One Subject &amp; Content Template Mixer</h2>
                  <p className="text-xs text-slate-500">Dynamic email pitch editor. Placeholders resolve live for each of your {preseededFounders.length} target founders!</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Placeholder Instructions:</span> Use <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 font-mono font-bold text-amber-900">[Name]</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 font-mono font-bold text-amber-900">[Company]</code>, and <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 font-mono font-bold text-amber-900">[Sector]</code> in the inputs below. They are instantly replaced with each founder's genuine details in the target place below!
                </div>
              </div>

              {/* Gmail API Connection Dashboard Badge */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <div className={`p-1.5 rounded-lg shrink-0 ${gmailAccessToken ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      Gmail Outreach Engine
                      {gmailAccessToken ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-normal">
                          ● Active API
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-normal">
                          Demo Sandbox
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {gmailAccessToken ? (
                        <>Connected with Gmail as <span className="font-extrabold text-slate-700">{gmailUserEmail}</span>. Bulk campaigns and instant sends will go out as genuine emails from your account!</>
                      ) : (
                        <>Currently in demo/simulation mode. Connect your Gmail inbox to shoot genuine, direct personalized outreach emails instantly.</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 self-end md:self-auto">
                  {gmailAccessToken ? (
                    <button
                      onClick={handleDisconnectGmail}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer transition-colors"
                    >
                      Disconnect Account
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectGmail}
                      disabled={isConnectingGmail}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shadow-xs hover:shadow-sm cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isConnectingGmail ? "Connecting..." : "Connect Gmail Inbox"}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Outreach Subject Line Template</label>
                  <input 
                    type="text" 
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-slate-50/50"
                    placeholder="e.g. Quick question about [Company] for [Name]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Content Body Template</label>
                  <textarea 
                    value={templateBody}
                    onChange={(e) => setTemplateBody(e.target.value)}
                    rows={6}
                    className="w-full p-3 border border-slate-200 rounded-lg text-xs font-sans text-slate-800 leading-relaxed focus:outline-none focus:border-slate-400 focus:bg-slate-50/50"
                    placeholder="Type pitch body here..."
                  />
                </div>

                <div className="flex items-start gap-2.5 bg-indigo-50/50 border border-indigo-100/60 p-3 rounded-xl mt-1.5">
                  <input
                    id="onlyVerifiedEmailsCheckbox"
                    type="checkbox"
                    checked={onlyVerifiedEmails}
                    onChange={(e) => setOnlyVerifiedEmails(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded-md focus:ring-indigo-500 cursor-pointer mt-0.5"
                  />
                  <label htmlFor="onlyVerifiedEmailsCheckbox" className="text-[11px] font-bold text-indigo-950 select-none cursor-pointer flex flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-indigo-800">
                      🛡️ Only Send to Verified Email Contacts <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.25 rounded font-black uppercase">Highly Recommended</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Automatically skips any contacts that have not been successfully validated or have been marked as "Not Found" by the verification system. Prevents email bounces and keeps your domain safe.
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-3 border-t border-slate-100 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleBatchApplyTemplate(false)}
                    disabled={selectedIds.length === 0 || bulkActionLoading || isShootingAll}
                    className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 disabled:opacity-40 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="Apply template to selected founders in directory."
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Save Template for Selected ({selectedIds.length})
                  </button>

                  <button
                    onClick={() => handleBatchApplyTemplate(true)}
                    disabled={bulkActionLoading || isShootingAll}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="Apply template to all founders matching filters."
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Save Template for All Filtered ({filteredFounders.length})
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                  <button
                    onClick={() => handleShootAllEmails(false)}
                    disabled={filteredFounders.length === 0 || isShootingAll || bulkActionLoading}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white px-5 py-2 rounded-xl text-xs font-black transition-colors shadow-xs cursor-pointer"
                    title="Simulates shooting personalized outreach to all filtered founders at once and tracks deliverability/failed rate."
                  >
                    <Send className="w-3.5 h-3.5 animate-pulse" />
                    <span>🚀 Shoot Emails to All at Once</span>
                  </button>

                  {selectedIds.length > 0 && (
                    <button
                      onClick={() => handleShootAllEmails(true)}
                      disabled={isShootingAll || bulkActionLoading}
                      className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      title="Shoot to selected targets only"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Shoot Selected ({selectedIds.length})
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* New Section: LinkedIn & Search AI Discoverer */}
          <div id="linkedin-ai-discoverer" className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            {/* Elegant Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shadow-inner">
                  <Linkedin className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-indigo-100 font-sans">
                    LinkedIn &amp; Shark Tank Discovery Studio 🚀
                  </h2>
                  <p className="text-xs text-indigo-300/90 leading-relaxed max-w-xl">
                    Target, search, and automate email outreach to growing young Indian founders. Strictly filtered to established companies with active paying capacity.
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                ⚡ STRICT GEOGRAPHY: INDIA ONLY
              </div>
            </div>

            {/* Premium Tab Bar Navigation */}
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
                <span>Live LinkedIn AI Discoverer 🔍</span>
              </button>
            </div>

            <div className="p-6">
              {/* TAB 1: PRE-SCRAPED DATABASE INTERACTIVE EXPLORER */}
              {discoverTab === "database" && (
                <div className="space-y-6">
                  {/* Explanatory Context */}
                  <div className="bg-indigo-50/50 border border-indigo-100/60 rounded-2xl p-4 flex gap-3">
                    <Award className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                        200+ Indian Young Founders &amp; Shark Tank Contestants Pre-Scraped
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        I have pre-scraped a targeted directory of 200 real and realistic high-potential young Indian founders and co-founders in advance for you! Every company size is verified to be <strong>above 10 employees</strong> to ensure active paying capacity so they can actually afford your premium product, design, or founder's office services.
                      </p>
                    </div>
                  </div>

                  {/* Interactive Filter Grid */}
                  <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search query */}
                    <div className="space-y-1.5 md:col-span-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Search Directory</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={dbSearchQuery}
                          onChange={(e) => setDbSearchQuery(e.target.value)}
                          placeholder="Search founder, startup..."
                          className="w-full bg-white text-slate-800 placeholder-slate-400 pl-8.5 pr-3 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Segment Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Startup Segment</label>
                      <div className="relative">
                        <select
                          value={dbSegmentFilter}
                          onChange={(e) => setDbSegmentFilter(e.target.value)}
                          className="w-full bg-white text-slate-800 py-2 pl-3 pr-8 rounded-lg border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-indigo-500 appearance-none cursor-pointer"
                        >
                          <option value="All">All Segments</option>
                          <option value="Shark Tank India Alumni">Shark Tank Alumni 🦈</option>
                          <option value="Funded Tech Startups">Funded Tech Startups 💰</option>
                          <option value="Bootstrapped & Profitable">Bootstrapped &amp; Profitable 📈</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Company Size Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Company Size</label>
                      <div className="relative">
                        <select
                          value={dbSizeFilter}
                          onChange={(e) => setDbSizeFilter(e.target.value)}
                          className="w-full bg-white text-slate-800 py-2 pl-3 pr-8 rounded-lg border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-indigo-500 appearance-none cursor-pointer"
                        >
                          <option value="All">All Sizes (Not too small)</option>
                          <option value="10-50 employees">Growth (10-50 employees)</option>
                          <option value="51-200 employees">Scale-up (51-200 employees)</option>
                          <option value="200+ employees">Enterprise (200+ employees)</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Niche/Industry Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Niche Industry</label>
                      <div className="relative">
                        <select
                          value={dbNicheFilter}
                          onChange={(e) => setDbNicheFilter(e.target.value)}
                          className="w-full bg-white text-slate-800 py-2 pl-3 pr-8 rounded-lg border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-indigo-500 appearance-none cursor-pointer"
                        >
                          <option value="All">All Niches</option>
                          <option value="AI & Tech">AI, DeepTech &amp; IT</option>
                          <option value="EdTech">EdTech &amp; Learning</option>
                          <option value="FinTech">FinTech &amp; Compliance</option>
                          <option value="D2C & Consumer Goods">D2C &amp; Consumer Brands</option>
                          <option value="SaaS & DevTools">SaaS &amp; Developer Tools</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Bulk Select Control Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200/80">
                    <div className="text-xs font-bold text-slate-600">
                      Showing <span className="text-indigo-600">{filteredDbLeads.length}</span> matching Indian founders. Selected <span className="text-indigo-600">{selectedDbIds.length}</span> targets.
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (selectedDbIds.length === filteredDbLeads.length) {
                            setSelectedDbIds([]);
                          } else {
                            setSelectedDbIds(filteredDbLeads.map(f => f.id));
                          }
                        }}
                        className="text-xs font-extrabold text-indigo-700 hover:underline cursor-pointer"
                      >
                        {selectedDbIds.length === filteredDbLeads.length ? "Deselect All" : "Select All Matching"}
                      </button>
                      <button
                        onClick={handleImportPreScrapedLeads}
                        disabled={loading || selectedDbIds.length === 0}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4.5 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Import Checked ({selectedDbIds.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Pre-Scraped Cards Grid */}
                  {filteredDbLeads.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl bg-white space-y-2">
                      <p className="text-sm font-black text-slate-800">No matching pre-scraped founders found.</p>
                      <p className="text-xs text-slate-500">Try broadening your search query or reset filters.</p>
                      <button
                        onClick={() => {
                          setDbSearchQuery("");
                          setDbSegmentFilter("All");
                          setDbSizeFilter("All");
                          setDbNicheFilter("All");
                        }}
                        className="text-xs font-bold text-indigo-600 underline hover:text-indigo-800 cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1.5 scrollbar-thin">
                      {filteredDbLeads.map((f) => {
                        const isChecked = selectedDbIds.includes(f.id);
                        return (
                          <div
                            key={f.id}
                            onClick={() => {
                              setSelectedDbIds(prev => 
                                prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id]
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
                                    setSelectedDbIds(prev => 
                                      prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id]
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
                                  <ExternalLink className="w-3 h-3" />
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

              {/* TAB 2: LIVE LINKEDIN AI CRAWLER */}
              {discoverTab === "live" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-indigo-50/30 border border-indigo-100/50 p-4 rounded-xl">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">LinkedIn AI Niche Discoverer</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Type any niche keyword to instantly search across our <strong>pre-scraped 200+ high-potential Indian founders database</strong>, or click <strong>Hunt Leads Live 🚀</strong> to launch a server-side web-grounded crawler.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                        Search Niche / Industry / Company Name
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={discoverNiche}
                            onChange={(e) => setDiscoverNiche(e.target.value)}
                            placeholder="e.g., Shark Tank, EdTech, D2C, Dukaan, AI Copilot, SaaS..."
                            disabled={isDiscovering}
                            className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-indigo-500 transition-colors disabled:opacity-60"
                          />
                        </div>
                        
                        {/* Dynamically Adjustable Limit Selector for live crawling */}
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                          <label className="text-[10px] font-black text-slate-400 uppercase shrink-0">Live Crawl Limit:</label>
                          <select
                            value={discoverLimit}
                            onChange={(e) => setDiscoverLimit(Number(e.target.value))}
                            disabled={isDiscovering}
                            className="bg-transparent text-xs font-extrabold text-indigo-700 focus:outline-hidden cursor-pointer"
                          >
                            <option value={5}>5 Leads</option>
                            <option value={10}>10 Leads</option>
                            <option value={15}>15 Leads</option>
                            <option value={20}>20 Leads 🚀</option>
                          </select>
                        </div>

                        <button
                          onClick={handleDiscoverLeads}
                          disabled={isDiscovering}
                          className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-colors cursor-pointer shadow-xs"
                        >
                          {isDiscovering ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Searching...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Hunt Leads Live 🚀</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suggestions:</span>
                        {[
                          "Shark Tank India",
                          "AI Tech",
                          "Bangalore EdTech",
                          "D2C & Consumer",
                          "SaaS"
                        ].map((s) => (
                          <button
                            key={s}
                            onClick={() => setDiscoverNiche(s)}
                            disabled={isDiscovering}
                            className="text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 rounded-lg px-2.5 py-0.75 transition-colors cursor-pointer"
                          >
                            +{s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {isDiscovering && (
                    <div className="p-8 border border-indigo-100 bg-indigo-50/40 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 animate-pulse">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                        <Linkedin className="absolute inset-0 m-auto w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-black text-indigo-900 tracking-wide uppercase">AI Research Crawl in Progress</p>
                        <p className="text-xs text-slate-600 font-mono font-bold bg-white px-4 py-1.5 rounded-lg border border-indigo-100 shadow-2xs inline-block">
                          {discoverStatusMsg}
                        </p>
                      </div>
                      <p className="text-[10px] text-indigo-500 max-w-md">
                        Scanning live web index for up to {discoverLimit} active Indian startup co-founders with at least 10–250 employees. We are running active DNS MX checks to protect your deliverability.
                      </p>
                    </div>
                  )}

                  {/* 1. INSTANT LOCAL DATABASE MATCHES (SOLVES USER REQUEST: "when i search in linkedin it searches in those scrapped") */}
                  {!isDiscovering && discoverNiche.trim() !== "" && (
                    <div className="space-y-4 border-t border-slate-200 pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                        <div>
                          <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                            <span className="flex items-center gap-1.5 font-black">
                              <Database className="w-4 h-4 text-indigo-600 shrink-0" />
                              Matches in Pre-Scraped Database ({localDiscoverMatches.length})
                            </span>
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase border border-emerald-200/50">
                              Instant 0ms Result
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">Founders from the 200+ pre-scraped list matching "{discoverNiche}".</p>
                        </div>

                        {localDiscoverMatches.length > 0 && (
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
                          <p className="text-xs text-slate-500">Click "Hunt Leads Live 🚀" to dispatch our AI agent to search LinkedIn &amp; Google indexes live!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1.5 scrollbar-thin">
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
                                      <ExternalLink className="w-3 h-3" />
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

                  {/* 2. LIVE DEEP CRAWLER RESULTS SECTION */}
                  {!isDiscovering && discoveredLeads.length > 0 && (
                    <div className="space-y-4 border-t border-slate-200 pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/20 p-4 rounded-xl border border-indigo-100/50">
                        <div>
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <span className="flex items-center gap-1.5 font-black text-indigo-950">
                              <Sparkles className="w-4 h-4 text-indigo-600" />
                              Live Web-Grounded Discoveries ({discoveredLeads.length})
                            </span>
                            <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[9px] font-black border border-indigo-200/50">
                              Live Grounded &amp; MX Verified
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">Fresh live research profiles generated on the fly using Gemini Grounding.</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              if (selectedDiscoverIds.length === discoveredLeads.length) {
                                setSelectedDiscoverIds([]);
                              } else {
                                setSelectedDiscoverIds(discoveredLeads.map((_, idx) => idx));
                              }
                            }}
                            className="text-xs font-black text-indigo-700 hover:underline cursor-pointer"
                          >
                            {selectedDiscoverIds.length === discoveredLeads.length ? "Deselect All" : "Select All Live"}
                          </button>

                          <button
                            onClick={handleImportDiscoveredLeads}
                            disabled={loading}
                            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4.5 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Import Selected ({selectedDiscoverIds.length})</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1.5 scrollbar-thin">
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
                                    <h4 className="text-xs font-black text-slate-800 tracking-wide uppercase flex items-center gap-1.5">
                                      {lead.company}
                                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.25 rounded font-black border border-slate-200/50">
                                        {lead.size || "10-50 employees"}
                                      </span>
                                    </h4>
                                    <p className="text-xs font-extrabold text-indigo-600">{lead.name}</p>
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
                                    <ExternalLink className="w-3 h-3" />
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

          {/* Section 2: A Place of All Founders & Tracking Status */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            
            {/* Filter controls and Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4 text-slate-600" />
                    Target Founders Directory ({totalRows} listed)
                  </h2>
                  <p className="text-xs text-slate-500">The central place of all founders with quick status tracking.</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setIsQuickPasteOpen(!isQuickPasteOpen)}
                    className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-indigo-600" />
                    Paste Email List
                  </button>

                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Custom Founder
                  </button>

                  <button
                    onClick={handleReSeedDataset}
                    className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title={`Restores the ${preseededFounders.length} preseeded dataset and deletes custom items`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Restore {preseededFounders.length} targets
                  </button>
                </div>
              </div>

              {/* Collapsible Quick Paste Emails box */}
              {isQuickPasteOpen && (
                <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-600" />
                      Paste Email List (One per line)
                    </h3>
                    <button 
                      onClick={() => setIsQuickPasteOpen(false)}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase"
                    >
                      Hide
                    </button>
                  </div>
                  <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                    Paste raw email addresses below (one email address per line). They will be instantly imported into your directory database as targets.
                  </p>
                  <textarea
                    value={bulkCsvInput}
                    onChange={(e) => setBulkCsvInput(e.target.value)}
                    rows={4}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-400"
                    placeholder="piyush@admitkard.com&#10;ankit@codesquad.co&#10;radhey@redjim.com"
                  />
                  <div className="flex justify-end gap-2 items-center">
                    <div className="flex items-center gap-1.5 mr-auto">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Set Initial Status:</span>
                      <select
                        value={csvImportStatus}
                        onChange={(e) => setCsvImportStatus(e.target.value as Founder["status"])}
                        className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-md font-bold cursor-pointer"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Generated">Generated</option>
                        <option value="Sent">Sent</option>
                        <option value="Replied">Replied</option>
                      </select>
                    </div>

                    <button
                      onClick={handleBulkCsvImport}
                      disabled={isCsvImporting || !bulkCsvInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {isCsvImporting ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Import {bulkCsvInput.trim() ? bulkCsvInput.split(/\r?\n/).filter(Boolean).length : 0} Email Targets</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Filtering Controls */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
                
                {/* Search query bar */}
                <div className="relative md:col-span-4">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, company, or sector..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-slate-400 bg-white"
                  />
                </div>

                {/* Status Filter buttons */}
                <div className="md:col-span-4 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    {["All", "Draft", "Generated", "Sent", "Replied", "Failed"].map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          statusFilter === st
                            ? "bg-white text-slate-800 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sector filter */}
                <div className="md:col-span-2 flex items-center gap-1.5 flex-wrap justify-start md:justify-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sector:</span>
                  <select
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 p-1.5 rounded-lg focus:outline-none cursor-pointer max-w-full font-semibold"
                  >
                    <option value="All">All</option>
                    {uniqueSectors.filter(s => s !== "All").map((sec) => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>

                {/* Verification filter */}
                <div className="md:col-span-2 flex items-center gap-1.5 flex-wrap justify-start md:justify-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verify:</span>
                  <select
                    value={verificationFilter}
                    onChange={(e) => setVerificationFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 p-1.5 rounded-lg focus:outline-none cursor-pointer max-w-full font-semibold"
                  >
                    <option value="All">All Leads</option>
                    <option value="Verified">Verified 🟢</option>
                    <option value="Unverified">Unverified 🟡</option>
                    <option value="NotFound">Not Found 🔴</option>
                  </select>
                </div>

              </div>
            </div>

            {/* Table Area */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">
                      <button 
                        onClick={handleToggleSelectAll}
                        className="text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {paginatedList.length > 0 && paginatedList.every(f => selectedIds.includes(f.id)) ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4 w-52">Founder / Company</th>
                    <th className="py-3 px-4 w-48">Contact Email</th>
                    <th className="py-3 px-4 w-36 text-center">Tracking Status</th>
                    <th className="py-3 px-4 w-52 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                        <p className="font-semibold text-xs">Synchronizing workspace directory...</p>
                      </td>
                    </tr>
                  ) : paginatedList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold">
                        No target founders matching the filters found. Try clearing search or click "Restore {preseededFounders.length} targets".
                      </td>
                    </tr>
                  ) : (
                    paginatedList.map((founder, idx) => {
                      const isChecked = selectedIds.includes(founder.id);
                      const resolved = resolveTemplate(templateSubject, templateBody, founder);
                      const hasManualGenerated = !!founder.personalizedEmail;
                      
                      const isExpanded = expandedFounderId === founder.id;
                      
                      return (
                        <React.Fragment key={founder.id}>
                          <tr 
                            className={`hover:bg-slate-50/50 transition-colors ${isChecked ? "bg-indigo-50/10" : ""} ${isExpanded ? "bg-indigo-50/5" : ""}`}
                          >
                            {/* Selector */}
                            <td className="py-4 px-4 text-center">
                              <button 
                                onClick={() => handleToggleSelectRow(founder.id)}
                                className="text-slate-400 hover:text-indigo-600 focus:outline-none cursor-pointer"
                              >
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </td>

                            {/* Founder Details */}
                            <td className="py-4 px-4">
                              <div>
                                <p className="font-extrabold text-slate-900 flex items-center gap-1.5">
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
                                  {founder.context?.toLowerCase().includes("shark tank") && (
                                    <span className="inline-flex items-center text-[8px] font-bold bg-amber-50 border border-amber-200/50 text-amber-700 px-1 py-0.2 rounded" title="Shark Tank India Contestant">
                                      <Award className="w-2.5 h-2.5 mr-0.5 text-amber-500" />
                                      Shark Tank
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">{founder.company}</p>
                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-slate-100 border border-slate-200/50 text-[9px] font-bold rounded text-slate-600 max-w-full truncate">
                                  {founder.sector}
                                </span>
                              </div>
                            </td>

                            {/* Contact Email */}
                            <td className="py-4 px-4">
                              <div className="flex flex-col gap-1 text-left">
                                <span className="font-mono text-[11px] select-all bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-100 block w-fit">
                                  {founder.email}
                                </span>
                                {founder.verificationStatus ? (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                      founder.verificationStatus === "Verified"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                        : "bg-amber-50 text-amber-700 border border-amber-100"
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${founder.verificationStatus === "Verified" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                                      {founder.verificationStatus}
                                    </span>
                                    {founder.verificationLogs && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          showConfirm(
                                            `Verification Details: ${founder.name}`,
                                            founder.verificationLogs || "No logs available",
                                            () => {},
                                            false,
                                            "Close"
                                          );
                                        }}
                                        className="text-[9px] font-bold text-indigo-600 hover:underline cursor-pointer"
                                        title="View Verification Logs"
                                      >
                                        logs
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[9px] font-semibold text-slate-400">Unverified</span>
                                )}
                              </div>
                            </td>

                            {/* Tracking Status */}
                            <td className="py-4 px-4">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`inline-block px-2.5 py-1 text-[11px] font-bold rounded-full w-24 text-center ${
                                  founder.status === "Replied"
                                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                    : founder.status === "Sent"
                                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                                    : founder.status === "Generated"
                                    ? "bg-purple-100 text-purple-700 border border-purple-200"
                                    : founder.status === "Failed"
                                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}>
                                  {founder.status}
                                </span>
                              </div>
                            </td>

                             {/* Individual Actions */}
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleVerifyFounder(founder.id)}
                                  disabled={loading}
                                  className="text-slate-400 hover:text-emerald-600 p-2 rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer disabled:opacity-40"
                                  title="Verify & Validate Contact Info"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                </button>

                                <button
                                  onClick={() => setExpandedFounderId(isExpanded ? null : founder.id)}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer ${
                                    isExpanded 
                                      ? "bg-indigo-600 text-white shadow-2xs" 
                                      : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100/60"
                                  }`}
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  {isExpanded ? "Hide Pitch" : "View Pitch"}
                                </button>

                                <button
                                  onClick={() => handleDeleteFounder(founder.id)}
                                  className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete target"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Collapsible Row */}
                          {isExpanded && (
                            <tr className="bg-slate-50/60 border-b border-slate-200/50">
                              <td colSpan={5} className="py-3 px-6">
                                <div className="space-y-3 bg-white border border-indigo-100 rounded-2xl p-4 shadow-3xs animate-in slide-in-from-top-1 duration-150">
                                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">EMAIL SUBJECT LINE</span>
                                      <span className="font-extrabold text-slate-900 text-xs mt-0.5">
                                        {hasManualGenerated ? founder.personalizedSubject : resolved.subject}
                                      </span>
                                    </div>
                                    {hasManualGenerated ? (
                                      <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[9px] font-extrabold px-2 py-0.5 rounded-lg shrink-0">Saved Custom Draft</span>
                                    ) : (
                                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-extrabold px-2 py-0.5 rounded-lg shrink-0">Resolved Template</span>
                                    )}
                                  </div>

                                  {/* LinkedIn Section & Background Info */}
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pb-3 border-b border-slate-100">
                                    {/* Left Column: Founder Context */}
                                    <div className="md:col-span-6 space-y-2 text-left">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Founder Context & Background</span>
                                      <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed min-h-[90px]">
                                        {founder.context || "No context provided. Use the LinkedIn helper to research their background!"}
                                      </div>
                                    </div>

                                    {/* Right Column: LinkedIn Quick Actions & URL Input */}
                                    <div className="md:col-span-6 space-y-2 text-left">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">LinkedIn Integration</span>
                                      <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-3 space-y-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                          {founder.linkedInUrl ? (
                                            <a
                                              href={founder.linkedInUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1.5 bg-[#0077b5] hover:bg-[#005582] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
                                            >
                                              <Linkedin className="w-3.5 h-3.5" />
                                              Go to LinkedIn Profile
                                            </a>
                                          ) : (
                                            <span className="text-[11px] font-bold text-slate-400 italic flex items-center gap-1.5 mr-auto">
                                              <Linkedin className="w-3.5 h-3.5 opacity-60 text-slate-400" />
                                              Profile URL not saved
                                            </span>
                                          )}

                                          <a
                                            href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(founder.name + ' ' + founder.company)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                          >
                                            <Search className="w-3.5 h-3.5" />
                                            Search LinkedIn
                                          </a>

                                          <a
                                            href={`https://www.google.com/search?q=${encodeURIComponent(founder.name + ' ' + founder.company + ' LinkedIn')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            Google Search
                                          </a>
                                        </div>

                                        {/* Editable URL Input */}
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">LinkedIn Profile URL</label>
                                          <input
                                            type="url"
                                            placeholder="Paste saved LinkedIn profile URL here..."
                                            defaultValue={founder.linkedInUrl || ""}
                                            onBlur={async (e) => {
                                              const newUrl = e.target.value.trim();
                                              if (newUrl !== (founder.linkedInUrl || "")) {
                                                try {
                                                  await updateDoc(doc(db, "founders", founder.id), {
                                                    linkedInUrl: newUrl || null,
                                                    updatedAt: new Date().toISOString()
                                                  });
                                                  setFounders(prev => prev.map(f => f.id === founder.id ? { ...f, linkedInUrl: newUrl || undefined } : f));
                                                  showSuccess(`LinkedIn URL updated for ${founder.name}!`);
                                                } catch (err) {
                                                  console.error("Failed to update LinkedIn URL:", err);
                                                  showError("Failed to update LinkedIn URL.");
                                                }
                                              }
                                            }}
                                            className="w-full bg-white border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-400 font-mono text-slate-800"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">EMAIL BODY PREVIEW (RESOLVED ON-THE-FLY)</span>
                                    <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-left select-all">
                                      {renderEmailBody(hasManualGenerated ? founder.personalizedEmail || "" : resolved.body)}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2.5 justify-end pt-1">
                                    {founder.status === "Sent" ? (
                                      <div className="flex flex-wrap items-center gap-2.5 w-full justify-between">
                                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-1.5 rounded-xl text-xs font-extrabold shadow-3xs animate-in zoom-in duration-150">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                          <span>Outreach Marked as Sent Successfully!</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleCopyPitch(founder, resolved.subject, resolved.body)}
                                            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                          >
                                            {copiedId === founder.id ? (
                                              <>
                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                <span className="text-emerald-700 font-black">Copied!</span>
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Copy Pitch</span>
                                              </>
                                            )}
                                          </button>

                                          {gmailAccessToken && (
                                            <button
                                              onClick={() => handleSendGmailInstantly(founder, hasManualGenerated ? founder.personalizedSubject : undefined, hasManualGenerated ? founder.personalizedEmail : undefined)}
                                              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-xl text-xs font-black transition-all shadow-2xs cursor-pointer animate-in zoom-in duration-150"
                                            >
                                              <Send className="w-3.5 h-3.5 text-indigo-200" />
                                              <span>Resend Instantly via API</span>
                                            </button>
                                          )}

                                          <a
                                            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(founder.email)}&su=${encodeURIComponent(hasManualGenerated ? founder.personalizedSubject || resolved.subject : resolved.subject)}&body=${encodeURIComponent(hasManualGenerated ? founder.personalizedEmail || resolved.body : resolved.body)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl text-xs font-black transition-all shadow-2xs cursor-pointer"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
                                            <span>Send Again via Gmail</span>
                                          </a>

                                          <button
                                            onClick={() => handleUpdateStatus(founder.id, "Draft")}
                                            className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                          >
                                            Reset Status
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2.5 justify-end w-full">
                                        <button
                                          onClick={() => handleCopyPitch(founder, resolved.subject, resolved.body)}
                                          className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                        >
                                          {copiedId === founder.id ? (
                                            <>
                                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                              <span className="text-emerald-700 font-black">Copied!</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                                              <span>Copy Pitch</span>
                                            </>
                                          )}
                                        </button>

                                        {gmailAccessToken && (
                                          <button
                                            onClick={() => handleSendGmailInstantly(founder, hasManualGenerated ? founder.personalizedSubject : undefined, hasManualGenerated ? founder.personalizedEmail : undefined)}
                                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl text-xs font-black transition-all shadow-2xs cursor-pointer animate-in zoom-in duration-150"
                                          >
                                            <Send className="w-3.5 h-3.5 text-emerald-200" />
                                            <span>Send Instantly via API</span>
                                          </button>
                                        )}

                                        <a
                                          href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(founder.email)}&su=${encodeURIComponent(hasManualGenerated ? founder.personalizedSubject || resolved.subject : resolved.subject)}&body=${encodeURIComponent(hasManualGenerated ? founder.personalizedEmail || resolved.body : resolved.body)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={() => {
                                            setTimeout(() => {
                                              handleUpdateStatus(founder.id, "Sent");
                                            }, 300);
                                          }}
                                          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-xl text-xs font-black transition-all shadow-2xs cursor-pointer"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5 text-indigo-200" />
                                          <span>Send via Gmail Web</span>
                                        </a>

                                        <a
                                          href={getMailtoUrl(founder, resolved.subject, resolved.body)}
                                          onClick={() => {
                                            setTimeout(() => {
                                              handleUpdateStatus(founder.id, "Sent");
                                            }, 300);
                                          }}
                                          className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                        >
                                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                                          <span>Default Mail Client</span>
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bulk Actions Floating Bar when selected */}
            {selectedIds.length > 0 && (
              <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
                <span className="text-xs font-bold flex items-center gap-1.5 text-indigo-200">
                  <CheckSquare className="w-4 h-4" />
                  {selectedIds.length} target founders selected for bulk processing
                </span>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Set Status:</span>
                  <button 
                    onClick={() => handleBulkStatusChange("Sent")}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    Mark Sent
                  </button>
                  <button 
                    onClick={() => handleBulkStatusChange("Replied")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    Mark Replied
                  </button>
                  <button 
                    onClick={() => handleBulkStatusChange("Failed")}
                    className="bg-rose-500 hover:bg-rose-600 text-white px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    Mark Failed
                  </button>
                  <button 
                    onClick={() => handleBulkStatusChange("Draft")}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    Mark Draft
                  </button>
                  <span className="text-slate-600 px-1">|</span>
                  <button 
                    onClick={handleBulkVerify}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    Verify Selected Contacts 🔍
                  </button>
                  <button 
                    onClick={handleBulkDelete}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            )}

            {/* Pagination controls */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 px-2 py-1 rounded focus:outline-none cursor-pointer font-bold"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                </select>
                <span>rows per page</span>
                <span className="text-slate-300 mx-1.5">|</span>
                <span className="font-medium text-slate-500">
                  Showing {totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, totalRows)} of {totalRows} targets
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-45 disabled:hover:bg-white font-bold cursor-pointer"
                >
                  Previous
                </button>
                
                <span className="font-bold text-slate-700">
                  Page {currentPage} of {totalPages || 1}
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-45 disabled:hover:bg-white font-bold cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Modular Add Founder Modal */}
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
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">SMTP Bulk Outreach Session</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Simulated high-volume delivery engine with persistent Firestore status tracking</p>
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
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Processed</p>
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
            <div className="flex-1 p-5 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1.5 bg-slate-950/90 text-slate-300 min-h-[250px] max-h-[350px]">
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
                {isCampaignSending 
                  ? "Campaign Sending Live..." 
                  : shootProgress.current === shootProgress.total 
                    ? "Session Complete. All statuses are persisted." 
                    : "Session stopped by user. Progress saved."}
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

      {/* Custom State-controlled Confirmation Dialog Modal */}
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

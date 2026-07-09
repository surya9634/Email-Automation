import { Founder } from "./types";

// Only one tutorial/walkthrough lead in the preseeded dataset to teach the user how to setup mail
export const preseededFounders: Founder[] = [
  {
    id: "tutorial-lead",
    name: "Suraj Sharma",
    company: "Founder Outreach Engine",
    sector: "Email Setup & Test Guide",
    context: "Welcome to the Founder Outreach Engine! This is your walkthrough target lead. Use this lead to test the Gemini personalized pitch generator and Gmail composer safely by sending an outreach email to yourself.",
    email: "surajsharma963472@gmail.com",
    linkedInUrl: "https://www.linkedin.com/in/surya-07-sharma/",
    status: "Draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

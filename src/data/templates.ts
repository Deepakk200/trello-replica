// Template gallery dataset (MODE LOCAL — see CLAUDE.md "Template gallery").
//
// Shape mirrors the planned Prisma Template/TemplateList/TemplateCard tables so
// the DB upgrade is mechanical: swap this file for `listTemplates`/`getTemplate`
// server actions and keep the gallery + `createBoardFromTemplate` interface
// identical. `viewCount` here is a seed; live increments layer on top via
// `useTemplateViews` (localStorage).

import type { LabelColor } from "@/types";

export const TEMPLATE_CATEGORIES = [
  "Business",
  "Design",
  "Education",
  "Engineering",
  "HR",
  "Marketing",
  "Personal",
  "Product Management",
  "Project Management",
  "Remote Work",
  "Sales",
  "Support",
  "Team Management",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export interface GalleryCard {
  title: string;
  description?: string;
  labels?: Array<{ name: string; color: LabelColor }>;
  checklist?: string[];
}
export interface GalleryList {
  title: string;
  cards: GalleryCard[];
}
export interface GalleryTemplate {
  id: string;
  slug: string;
  title: string;
  category: TemplateCategory;
  description: string;
  /** CSS background used for the preview thumbnail + cloned board background. */
  previewColor: string;
  author: string;
  /** Seed view count; live opens add to this via useTemplateViews. */
  viewCount: number;
  featured?: boolean;
  lists: GalleryList[];
}

const L = (title: string, cards: GalleryCard[]): GalleryList => ({ title, cards });

export const TEMPLATES: GalleryTemplate[] = [
  {
    id: "kanban", slug: "kanban-board", title: "Kanban Board", category: "Engineering",
    description: "A classic Kanban board to visualize continuous work and limit work-in-progress across your team.",
    previewColor: "linear-gradient(135deg,#0079bf,#5067c5)", author: "Trello", viewCount: 1284000, featured: true,
    lists: [
      L("Backlog", [
        { title: "Set up project structure", labels: [{ name: "Setup", color: "blue" }] },
        { title: "Define tech stack" },
      ]),
      L("To Do", [{ title: "Design database schema", checklist: ["List entities", "Define relations", "Review with team"] }]),
      L("In Progress", [{ title: "Build core features", labels: [{ name: "Feature", color: "green" }] }]),
      L("Review", []),
      L("Done", [{ title: "Project kickoff" }]),
    ],
  },
  {
    id: "scrum-sprint", slug: "scrum-sprint", title: "Scrum Sprint", category: "Engineering",
    description: "Run an agile sprint with a product backlog, sprint backlog, and burndown-friendly columns.",
    previewColor: "linear-gradient(135deg,#519839,#4bce97)", author: "Trello", viewCount: 642500, featured: true,
    lists: [
      L("Product Backlog", [
        { title: "User authentication", labels: [{ name: "Epic", color: "purple" }] },
        { title: "Dashboard UI" },
      ]),
      L("Sprint Backlog", [{ title: "Login page", description: "Email + Google OAuth." }]),
      L("In Progress", []),
      L("In Review", []),
      L("Done", []),
    ],
  },
  {
    id: "bug-tracker", slug: "bug-tracking", title: "Bug Tracking", category: "Engineering",
    description: "Track bugs from report to resolution with severity labels and a verification checklist.",
    previewColor: "linear-gradient(135deg,#b04632,#e74c3c)", author: "Trello", viewCount: 389000,
    lists: [
      L("Reported", [{ title: "Crash on logout", labels: [{ name: "Critical", color: "red" }] }]),
      L("Triaged", [{ title: "Misaligned button on mobile", labels: [{ name: "Low", color: "yellow" }] }]),
      L("In Progress", []),
      L("Testing", [{ title: "Verify fix", checklist: ["Reproduce", "Apply fix", "Add regression test", "QA sign-off"] }]),
      L("Resolved", []),
    ],
  },
  {
    id: "product-roadmap", slug: "product-roadmap", title: "Product Roadmap", category: "Product Management",
    description: "Plan a product roadmap across now / next / later with clear ownership of initiatives.",
    previewColor: "linear-gradient(135deg,#6554c0,#8777d9)", author: "Trello", viewCount: 511200, featured: true,
    lists: [
      L("Ideas", [{ title: "AI summary for cards" }, { title: "Calendar power-up" }]),
      L("Now", [{ title: "Onboarding revamp", labels: [{ name: "Q3", color: "sky" }] }]),
      L("Next", [{ title: "Mobile offline mode" }]),
      L("Later", []),
      L("Shipped", [{ title: "Dark mode" }]),
    ],
  },
  {
    id: "okrs", slug: "okrs", title: "OKRs", category: "Product Management",
    description: "Set objectives and track measurable key results for the quarter.",
    previewColor: "linear-gradient(135deg,#0747a6,#0052cc)", author: "Trello", viewCount: 233700,
    lists: [
      L("Objectives", [{ title: "Grow active teams by 25%" }]),
      L("Key Results", [
        { title: "Activation rate 40% → 55%", labels: [{ name: "On track", color: "green" }] },
        { title: "Reduce churn to < 3%", labels: [{ name: "At risk", color: "orange" }] },
      ]),
      L("Initiatives", [{ title: "Templates gallery", checklist: ["Design", "Build", "Launch"] }]),
      L("Done", []),
    ],
  },
  {
    id: "project-management", slug: "project-management", title: "Project Management", category: "Project Management",
    description: "A simple, flexible board to manage any project from intake to delivery.",
    previewColor: "linear-gradient(135deg,#172b4d,#0052cc)", author: "Trello", viewCount: 1750000, featured: true,
    lists: [
      L("Intake", [{ title: "New project request" }]),
      L("Planning", [{ title: "Scope & timeline", checklist: ["Define scope", "Estimate", "Get approval"] }]),
      L("In Progress", []),
      L("Blocked", []),
      L("Complete", []),
    ],
  },
  {
    id: "editorial-calendar", slug: "editorial-calendar", title: "Editorial Calendar", category: "Marketing",
    description: "Plan, draft, and publish content across channels with a clear editorial pipeline.",
    previewColor: "linear-gradient(135deg,#d29034,#f5a623)", author: "Trello", viewCount: 458900, featured: true,
    lists: [
      L("Ideas", [{ title: "Q1 blog themes" }, { title: "Social series" }]),
      L("Drafting", [{ title: "January newsletter", labels: [{ name: "Email", color: "pink" }] }]),
      L("Editing", []),
      L("Scheduled", []),
      L("Published", [{ title: "Welcome post" }]),
    ],
  },
  {
    id: "marketing-campaign", slug: "marketing-campaign", title: "Marketing Campaign", category: "Marketing",
    description: "Coordinate a multi-channel campaign from brief to retrospective.",
    previewColor: "linear-gradient(135deg,#cd519d,#e774bb)", author: "Trello", viewCount: 312400,
    lists: [
      L("Brief", [{ title: "Campaign goals & audience" }]),
      L("Assets", [{ title: "Landing page copy", labels: [{ name: "Copy", color: "blue" }] }, { title: "Ad creatives", labels: [{ name: "Design", color: "purple" }] }]),
      L("In Review", []),
      L("Live", []),
      L("Wrap-up", [{ title: "Post-mortem", checklist: ["Pull metrics", "Document learnings"] }]),
    ],
  },
  {
    id: "crm-pipeline", slug: "sales-pipeline", title: "Sales Pipeline (CRM)", category: "Sales",
    description: "Move deals through your pipeline from lead to closed-won with stage columns.",
    previewColor: "linear-gradient(135deg,#00857a,#00b8a9)", author: "Trello", viewCount: 540300, featured: true,
    lists: [
      L("Leads", [{ title: "Acme Corp", labels: [{ name: "Inbound", color: "lime" }] }]),
      L("Contacted", [{ title: "Globex Inc" }]),
      L("Proposal", [{ title: "Initech — sent quote", checklist: ["Send proposal", "Follow up", "Negotiate"] }]),
      L("Negotiation", []),
      L("Closed Won", []),
      L("Closed Lost", []),
    ],
  },
  {
    id: "support-queue", slug: "support-queue", title: "Support Queue", category: "Support",
    description: "Triage and resolve customer support tickets by priority and status.",
    previewColor: "linear-gradient(135deg,#0052cc,#2684ff)", author: "Trello", viewCount: 198600,
    lists: [
      L("New", [{ title: "Password reset not working", labels: [{ name: "Urgent", color: "red" }] }]),
      L("In Progress", []),
      L("Waiting on Customer", []),
      L("Resolved", []),
    ],
  },
  {
    id: "design-handoff", slug: "design-handoff", title: "Design Handoff", category: "Design",
    description: "Take designs from brief through review to a clean engineering handoff.",
    previewColor: "linear-gradient(135deg,#89609e,#b388eb)", author: "Trello", viewCount: 176400,
    lists: [
      L("Brief", [{ title: "Feature: card covers" }]),
      L("Exploration", [{ title: "Wireframes", labels: [{ name: "WIP", color: "yellow" }] }]),
      L("Design Review", [{ title: "High-fidelity mockups", checklist: ["Light theme", "Dark theme", "Responsive"] }]),
      L("Ready for Dev", []),
      L("Shipped", []),
    ],
  },
  {
    id: "design-system", slug: "design-system", title: "Design System", category: "Design",
    description: "Track components, tokens, and documentation for your design system.",
    previewColor: "linear-gradient(135deg,#403294,#6554c0)", author: "Trello", viewCount: 121800,
    lists: [
      L("Backlog", [{ title: "Button variants" }, { title: "Color tokens" }]),
      L("In Design", []),
      L("In Build", []),
      L("Documented", []),
    ],
  },
  {
    id: "onboarding", slug: "employee-onboarding", title: "Employee Onboarding", category: "HR",
    description: "Give new hires a smooth first 90 days with a structured onboarding board.",
    previewColor: "linear-gradient(135deg,#1f845a,#22a06b)", author: "Trello", viewCount: 287500, featured: true,
    lists: [
      L("Before Day 1", [{ title: "Send welcome email", checklist: ["Laptop ordered", "Accounts created", "Buddy assigned"] }]),
      L("Week 1", [{ title: "Team intros", labels: [{ name: "People", color: "sky" }] }]),
      L("Month 1", []),
      L("90 Days", []),
    ],
  },
  {
    id: "remote-team", slug: "remote-team-hub", title: "Remote Team Hub", category: "Remote Work",
    description: "Keep a distributed team aligned with async updates, decisions, and rituals.",
    previewColor: "linear-gradient(135deg,#206a83,#1d9bf0)", author: "Trello", viewCount: 142300,
    lists: [
      L("Announcements", [{ title: "Team handbook" }]),
      L("Weekly Updates", [{ title: "This week's focus" }]),
      L("Decisions", [{ title: "Adopt 4-day release cadence", labels: [{ name: "Decided", color: "green" }] }]),
      L("Watercooler", []),
    ],
  },
  {
    id: "team-management", slug: "team-management", title: "Team Management", category: "Team Management",
    description: "Run 1:1s, track goals, and manage team capacity in one place.",
    previewColor: "linear-gradient(135deg,#974f0c,#d29034)", author: "Trello", viewCount: 98700,
    lists: [
      L("1:1 Agenda", [{ title: "Talking points" }]),
      L("Goals", [{ title: "Q3 growth goal", checklist: ["Define", "Track", "Review"] }]),
      L("Capacity", []),
      L("Recognition", []),
    ],
  },
  {
    id: "course-planning", slug: "course-planning", title: "Course Planning", category: "Education",
    description: "Plan a course or curriculum by module, with assignments and grading.",
    previewColor: "linear-gradient(135deg,#5243aa,#8777d9)", author: "Trello", viewCount: 76500,
    lists: [
      L("Modules", [{ title: "Module 1: Foundations" }, { title: "Module 2: Practice" }]),
      L("Lessons", [{ title: "Lecture slides", labels: [{ name: "Content", color: "blue" }] }]),
      L("Assignments", [{ title: "Homework 1", checklist: ["Write prompt", "Make rubric", "Publish"] }]),
      L("Graded", []),
    ],
  },
  {
    id: "personal-productivity", slug: "personal-productivity", title: "Personal Productivity", category: "Personal",
    description: "A personal GTD-style board to capture, organize, and finish what matters.",
    previewColor: "linear-gradient(135deg,#b04632,#e2483d)", author: "Trello", viewCount: 905100, featured: true,
    lists: [
      L("Inbox", [{ title: "Brain dump" }]),
      L("Today", [{ title: "Top 3 priorities", labels: [{ name: "Focus", color: "orange" }] }]),
      L("This Week", []),
      L("Someday", []),
      L("Done", []),
    ],
  },
  {
    id: "business-plan", slug: "business-plan", title: "Business Plan", category: "Business",
    description: "Organize a business plan from research to launch milestones.",
    previewColor: "linear-gradient(135deg,#42526e,#6b778c)", author: "Trello", viewCount: 88300,
    lists: [
      L("Research", [{ title: "Market analysis", checklist: ["TAM/SAM/SOM", "Competitors", "Pricing"] }]),
      L("Strategy", [{ title: "Positioning" }]),
      L("Operations", []),
      L("Milestones", []),
    ],
  },
];

/** "125.5k" / "1.2M" style compact view-count formatting. */
export function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

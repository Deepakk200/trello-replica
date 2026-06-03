// Plain module (NOT "use server") so both the server action and client
// components can import the template definitions.

export const BOARD_TEMPLATES = [
  { id: "kanban", name: "Kanban Board", description: "A classic Kanban board for continuous work.", background: "linear-gradient(135deg,#0052CC,#0747A6)", lists: ["Backlog", "To Do", "In Progress", "Review", "Done"] },
  { id: "sprint", name: "Sprint Planning", description: "Plan and track a development sprint.", background: "linear-gradient(135deg,#00875A,#006644)", lists: ["Sprint Backlog", "In Progress", "QA", "Done", "Blocked"] },
  { id: "bug-tracker", name: "Bug Tracker", description: "Track bugs from discovery to resolution.", background: "linear-gradient(135deg,#E2483D,#BF2600)", lists: ["Reported", "Triaged", "In Progress", "Testing", "Resolved"] },
  { id: "project-roadmap", name: "Project Roadmap", description: "High-level view of goals and milestones.", background: "linear-gradient(135deg,#6554C0,#403294)", lists: ["Ideas", "Planned", "In Progress", "Launched", "On Hold"] },
] as const;

export type TemplateId = (typeof BOARD_TEMPLATES)[number]["id"];

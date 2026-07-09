import { v4 as uuid } from "uuid";
import type { Note, Section, Workspace } from "../types";

const now = Date.now();
const hours = (n: number) => now - n * 60 * 60 * 1000;
const minutes = (n: number) => now - n * 60 * 1000;

export function buildSeed(): { workspaces: Workspace[]; sections: Section[]; notes: Note[] } {
  const cansaas = uuid();
  const marketing = uuid();
  const gardening = uuid();
  const socialMedia = uuid();

  const workspaces: Workspace[] = [
    { id: cansaas, name: "Cansaas", icon: "#", order: 0 },
    { id: marketing, name: "Marketing", icon: "📣", order: 1 },
    { id: gardening, name: "Gardening", icon: "🌱", order: 2 },
    { id: socialMedia, name: "Social Media", icon: "💬", order: 3 },
  ];

  const ideas = uuid();
  const research = uuid();
  const drafts = uuid();

  const sections: Section[] = [
    { id: ideas, workspaceId: cansaas, name: "Ideas", order: 0 },
    { id: research, workspaceId: cansaas, name: "Research", order: 1 },
    { id: drafts, workspaceId: cansaas, name: "Drafts", order: 2 },
  ];

  const note = (
    workspaceId: string,
    sectionId: string,
    title: string,
    content: string,
    color: Note["color"],
    createdAt: number,
    extra?: Partial<Note>,
  ): Note => ({
    id: uuid(),
    workspaceId,
    sectionId,
    title,
    content,
    color,
    starred: false,
    archived: false,
    trashed: false,
    createdAt,
    updatedAt: createdAt,
    ...extra,
  });

  const notes: Note[] = [
    note(
      cansaas,
      ideas,
      "Training",
      "Ongoing training opportunities can boost employee morale and retention rates.\n\n- Types of training\n- Mentorship programs",
      "red",
      minutes(2),
    ),
    note(
      cansaas,
      ideas,
      "Team Building",
      "- Importance of teamwork\n- Activities to foster collaboration\n- Remote team-building ideas\n- Measuring team effectiveness\n\nStrong team dynamics can lead to improved productivity and job satisfaction.",
      "red",
      hours(3),
    ),
    note(
      cansaas,
      research,
      "Company Culture",
      "A positive company culture can attract top talent and enhance employee engagement.\n\n- Defining company values\n- Creating an inclusive environment\n- Celebrating diversity\n- Encouraging feedback",
      "blue",
      hours(5),
    ),
    note(
      cansaas,
      research,
      "Work-Life Balance",
      "- Flexible working hours\n- Remote work policies\n- Importance of mental health\n- Encouraging breaks\n\nPromoting work-life balance can reduce burnout and increase productivity.",
      "blue",
      hours(12),
    ),
    note(
      cansaas,
      research,
      "Employee Engagement",
      "Engaged employees are more likely to contribute to company goals and stay longer.\n\n- Understanding employee needs\n- Feedback mechanisms\n- Recognition programs",
      "blue",
      hours(24),
    ),
    note(
      cansaas,
      drafts,
      "Performance Management",
      "- Setting clear expectations\n- Regular check-ins\n- Constructive feedback\n- Goal setting for teams",
      "green",
      hours(30),
    ),
    note(
      cansaas,
      drafts,
      "Succession Planning",
      "Effective succession planning ensures continuity and prepares the organization for future challenges.",
      "green",
      hours(36),
    ),
    note(
      cansaas,
      drafts,
      "Conflict Resolution",
      "Addressing conflicts promptly can prevent escalation and maintain team harmony.\n\n- Identifying conflict triggers\n- Effective communication strategies",
      "green",
      hours(40),
      { starred: true },
    ),
    note(marketing, ideas, "Branding Plan", "Brand voice, visual identity, and positioning notes for the new quarter.", "purple", hours(20)),
    note(gardening, ideas, "Monthly Care", "Watering schedule, feeding, and seasonal care checklist.", "amber", hours(48), { starred: true }),
    note(gardening, ideas, "Plant Journal", "Growth log and observations for the garden beds.", "amber", hours(60), { starred: true }),
    note(gardening, ideas, "Harvest Log", "Track what was harvested and when.", "amber", hours(72)),
  ];

  return { workspaces, sections, notes };
}

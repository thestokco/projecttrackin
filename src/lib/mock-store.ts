import type { Profile, Submission, TeamSettings } from "./types";

const DEMO_USER: Profile = {
  id: "demo-user-1",
  name: "John Doe",
  email: "john@example.com",
  contact_no: "+60 12-345 6789",
  role: "admin",
  created_at: "2026-01-01T00:00:00Z",
};

const DEMO_PROFILES: Profile[] = [
  DEMO_USER,
];

const DEMO_SUBMISSIONS: Submission[] = [];

const DEMO_SETTINGS: TeamSettings = {
  id: "settings-1",
  admin_code: "PT26ADMIN",
  member_code: "STOKTEAM",
  created_at: "2026-01-01T00:00:00Z",
};

let submissions = [...DEMO_SUBMISSIONS];
let teamSettings = { ...DEMO_SETTINGS };
let listeners: (() => void)[] = [];

export const mockStore = {
  isDemoMode(): boolean {
    return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  },

  getUser() {
    return DEMO_USER;
  },

  getProfiles() {
    return DEMO_PROFILES;
  },

  getSubmissions() {
    return [...submissions].sort(
      (a, b) =>
        new Date(b.submission_date).getTime() -
        new Date(a.submission_date).getTime()
    );
  },

  getUserSubmissions(userId: string) {
    return [...submissions]
      .filter((s) => s.user_id === userId)
      .sort(
        (a, b) =>
          new Date(b.submission_date).getTime() -
          new Date(a.submission_date).getTime()
      );
  },

  getSubmission(id: string) {
    return submissions.find((s) => s.id === id) || null;
  },

  addSubmission(data: Omit<Submission, "id" | "created_at">) {
    const newSub: Submission = {
      ...data,
      id: `sub-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    submissions = [newSub, ...submissions];
    listeners.forEach((fn) => fn());
    return newSub;
  },

  updateSubmission(id: string, data: Partial<Submission>) {
    submissions = submissions.map((s) =>
      s.id === id ? { ...s, ...data } : s
    );
    listeners.forEach((fn) => fn());
  },

  deleteSubmission(id: string) {
    submissions = submissions.filter((s) => s.id !== id);
    listeners.forEach((fn) => fn());
  },

  getTeamSettings() {
    return { ...teamSettings };
  },

  updateTeamSettings(data: { admin_code?: string; member_code?: string }) {
    teamSettings = { ...teamSettings, ...data };
    listeners.forEach((fn) => fn());
  },

  validateCode(code: string): "admin" | "member" | null {
    if (code === teamSettings.admin_code) return "admin";
    if (code === teamSettings.member_code) return "member";
    return null;
  },

  subscribe(fn: () => void) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },
};

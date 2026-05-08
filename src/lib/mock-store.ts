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
  {
    id: "demo-user-2",
    name: "Jane Smith",
    email: "jane@example.com",
    contact_no: "+60 12-987 6543",
    role: "member",
    created_at: "2026-01-15T00:00:00Z",
  },
  {
    id: "demo-user-3",
    name: "Ali Rahman",
    email: "ali@example.com",
    contact_no: "+60 11-222 3333",
    role: "member",
    created_at: "2026-02-01T00:00:00Z",
  },
];

const DEMO_SUBMISSIONS: Submission[] = [
  {
    id: "sub-1",
    user_id: "demo-user-1",
    user_name: "John Doe",
    submission_date: "2026-05-01",
    submission_time: "09:30:00",
    completion_date: "2026-05-05",
    application_number: "APP-2026-001",
    cable_return: true,
    cable_return_date: "2026-05-03",
    photos: [
      "https://picsum.photos/seed/cable1/400/300",
      "https://picsum.photos/seed/cable2/400/300",
      "https://picsum.photos/seed/cable3/400/300",
    ],
    remark: "Completed ahead of schedule",
    created_at: "2026-05-01T09:30:00Z",
  },
  {
    id: "sub-2",
    user_id: "demo-user-1",
    user_name: "John Doe",
    submission_date: "2026-05-03",
    submission_time: "14:15:00",
    completion_date: "2026-05-10",
    application_number: "APP-2026-002",
    cable_return: false,
    cable_return_date: null,
    photos: [],
    remark: null,
    created_at: "2026-05-03T14:15:00Z",
  },
  {
    id: "sub-3",
    user_id: "demo-user-2",
    user_name: "Jane Smith",
    submission_date: "2026-05-02",
    submission_time: "10:00:00",
    completion_date: "2026-05-08",
    application_number: "APP-2026-003",
    cable_return: true,
    cable_return_date: "2026-05-06",
    photos: [],
    remark: "Site inspection completed. All cables returned.",
    created_at: "2026-05-02T10:00:00Z",
  },
  {
    id: "sub-4",
    user_id: "demo-user-2",
    user_name: "Jane Smith",
    submission_date: "2026-05-05",
    submission_time: "16:45:00",
    completion_date: "2026-05-12",
    application_number: "APP-2026-004",
    cable_return: false,
    cable_return_date: null,
    photos: [],
    remark: "Pending cable collection from site B",
    created_at: "2026-05-05T16:45:00Z",
  },
  {
    id: "sub-5",
    user_id: "demo-user-1",
    user_name: "John Doe",
    submission_date: "2026-04-15",
    submission_time: "11:20:00",
    completion_date: "2026-04-20",
    application_number: "APP-2026-005",
    cable_return: true,
    cable_return_date: "2026-04-18",
    photos: [],
    remark: null,
    created_at: "2026-04-15T11:20:00Z",
  },
];

const DEMO_SETTINGS: TeamSettings = {
  id: "settings-1",
  admin_code: "ADMIN2026",
  member_code: "TEAM2026",
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

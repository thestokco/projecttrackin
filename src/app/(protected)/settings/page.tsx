"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockStore } from "@/lib/mock-store";
import { useUser } from "@/lib/user-context";
import type { Profile, TeamSettings } from "@/lib/types";
import { format } from "date-fns";
import {
  Settings,
  Shield,
  Users,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  UserX,
  User,
  Save,
  CheckCircle,
} from "lucide-react";

function generateCode(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function SettingsPage() {
  const { profile, isAdmin, updateProfile } = useUser();
  const isDemo = mockStore.isDemoMode();
  const [settings, setSettings] = useState<TeamSettings | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [showMemberCode, setShowMemberCode] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editContact, setEditContact] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (!profile) return;

    setEditName(profile.name);
    setEditEmail(profile.email);
    setEditContact(profile.contact_no);

    if (isDemo) {
      setSettings(mockStore.getTeamSettings());
      if (isAdmin) setMembers(mockStore.getProfiles());
      setLoading(false);
      return;
    }

    const supabase = createClient();
    async function fetchData() {
      const settingsRes = await supabase
        .from("team_settings")
        .select("*")
        .single();
      if (settingsRes.data) setSettings(settingsRes.data);

      if (isAdmin) {
        const membersRes = await supabase
          .from("profiles")
          .select("*")
          .order("created_at");
        if (membersRes.data) setMembers(membersRes.data);
      }
      setLoading(false);
    }
    fetchData();
  }, [profile, isAdmin, isDemo]);

  async function handleCopy(text: string, field: string) {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function handleRegenerate(type: "admin" | "member") {
    setRegenerating(type);
    const newCode = generateCode();
    const update =
      type === "admin" ? { admin_code: newCode } : { member_code: newCode };

    if (isDemo) {
      mockStore.updateTeamSettings(update);
      setSettings(mockStore.getTeamSettings());
    } else {
      const supabase = createClient();
      await supabase
        .from("team_settings")
        .update(update)
        .eq("id", settings!.id);
      setSettings((prev) => (prev ? { ...prev, ...update } : prev));
    }
    setRegenerating(null);
  }

  async function handleRemoveMember(memberId: string) {
    if (isDemo) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } else {
      const supabase = createClient();
      await supabase.from("profiles").delete().eq("id", memberId);
    }
    setRemoveId(null);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setProfileError("");
    setSavingProfile(true);

    const updates = {
      name: editName.trim(),
      email: editEmail.trim(),
      contact_no: editContact.trim(),
    };

    if (!updates.name || !updates.email || !updates.contact_no) {
      setProfileError("All fields are required");
      setSavingProfile(false);
      return;
    }

    try {
      if (isDemo) {
        updateProfile(updates);
      } else {
        const supabase = createClient();
        const { error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", profile.id);
        if (error) throw error;
        updateProfile(updates);
      }

      if (isAdmin) {
        setMembers((prev) =>
          prev.map((m) => (m.id === profile.id ? { ...m, ...updates } : m))
        );
      }

      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setProfileError(message);
    } finally {
      setSavingProfile(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="space-y-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            My Profile
          </h2>

          {profileSaved && (
            <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Profile updated successfully
            </div>
          )}

          {profileError && (
            <div className="bg-red-50 text-danger border border-red-200 rounded-lg p-3 mb-4 text-sm">
              {profileError}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Contact Number
              </label>
              <input
                type="tel"
                value={editContact}
                onChange={(e) => setEditContact(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Invitation Codes
          </h2>
          <p className="text-sm text-muted mb-5">
            {isAdmin
              ? "Share these codes with people who need to sign up. Admin code gives full access, member code gives limited access."
              : "Share this code to invite new team members."}
          </p>

          <div className="space-y-4">
            {isAdmin && (
              <CodeField
                label="Admin Code"
                code={settings.admin_code}
                show={showAdminCode}
                onToggleShow={() => setShowAdminCode(!showAdminCode)}
                onCopy={() => handleCopy(settings.admin_code, "admin")}
                onRegenerate={() => handleRegenerate("admin")}
                copied={copiedField === "admin"}
                regenerating={regenerating === "admin"}
                variant="admin"
                canRegenerate
              />
            )}

            <CodeField
              label="Team Member Code"
              code={settings.member_code}
              show={showMemberCode}
              onToggleShow={() => setShowMemberCode(!showMemberCode)}
              onCopy={() => handleCopy(settings.member_code, "member")}
              onRegenerate={() => handleRegenerate("member")}
              copied={copiedField === "member"}
              regenerating={regenerating === "member"}
              variant="member"
              canRegenerate={isAdmin}
            />
          </div>
        </div>

        {isAdmin && (
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Team Members ({members.length})
            </h2>

            <div className="divide-y divide-border">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{m.name}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          m.role === "admin"
                            ? "bg-primary/10 text-primary"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {m.role}
                      </span>
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {m.email} · {m.contact_no}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">
                      Joined {format(new Date(m.created_at), "dd MMM yyyy")}
                    </span>
                    {m.id !== profile?.id && (
                      <button
                        onClick={() => setRemoveId(m.id)}
                        className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-red-50 transition-colors"
                        title="Remove member"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {removeId && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Remove Member</h3>
            <p className="text-sm text-muted mb-6">
              Are you sure you want to remove this team member? They will no
              longer be able to access the app.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleRemoveMember(removeId)}
                className="flex-1 bg-danger text-white py-2 rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
              <button
                onClick={() => setRemoveId(null)}
                className="flex-1 border border-border py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CodeField({
  label,
  code,
  show,
  onToggleShow,
  onCopy,
  onRegenerate,
  copied,
  regenerating,
  variant,
  canRegenerate,
}: {
  label: string;
  code: string;
  show: boolean;
  onToggleShow: () => void;
  onCopy: () => void;
  onRegenerate: () => void;
  copied: boolean;
  regenerating: boolean;
  variant: "admin" | "member";
  canRegenerate: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        variant === "admin"
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-gray-50"
      }`}
    >
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="flex items-center gap-2">
        <div className="flex-1 px-4 py-2.5 bg-white border border-border rounded-lg font-mono text-sm tracking-wider select-all">
          {show ? code : "••••••••"}
        </div>
        <button
          onClick={onToggleShow}
          className="p-2.5 rounded-lg border border-border hover:bg-gray-100 transition-colors"
          title={show ? "Hide" : "Show"}
        >
          {show ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={onCopy}
          className="p-2.5 rounded-lg border border-border hover:bg-gray-100 transition-colors"
          title="Copy"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
        {canRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="p-2.5 rounded-lg border border-border hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Generate new code"
          >
            <RefreshCw
              className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`}
            />
          </button>
        )}
      </div>
    </div>
  );
}

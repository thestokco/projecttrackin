"use client";

import { useEffect, useState, useCallback } from "react";
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
  Lock,
  Type,
} from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";
import { getFontSize, setFontSize, FONT_SIZES, type FontSize } from "@/lib/font-size";

function generateCode(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
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
  const [showMemberCode, setShowMemberCode] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editContact, setEditContact] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const fetchSettings = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

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
    if (isAdmin) {
      const settingsRes = await supabase
        .from("team_settings")
        .select("*")
        .single();
      if (settingsRes.data) setSettings(settingsRes.data);

      const membersRes = await supabase
        .from("profiles")
        .select("*")
        .order("created_at");
      if (membersRes.data) setMembers(membersRes.data);
    } else {
      const { data: memberCode } = await supabase.rpc(
        "get_member_invite_code"
      );
      if (memberCode) {
        setSettings({
          id: "",
          admin_code: "",
          member_code: memberCode,
          created_at: "",
        });
      }
    }
    setLoading(false);
  }, [profile, isAdmin, isDemo]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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

  const [removeError, setRemoveError] = useState("");
  const [fontSize, setFontSizeState] = useState<FontSize>("medium");

  useEffect(() => {
    setFontSizeState(getFontSize());
  }, []);

  async function handleRemoveMember(memberId: string) {
    setRemoveError("");
    if (isDemo) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } else {
      const res = await fetch("/api/admin/delete-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setRemoveError(data.error || "Failed to remove member");
        setRemoveId(null);
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");

    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setSavingPassword(true);

    try {
      if (isDemo) {
        setPasswordSaved(true);
        setTimeout(() => setPasswordSaved(false), 2000);
      } else {
        if (!profile) throw new Error("Not signed in");
        const supabase = createClient();
        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password: currentPassword,
        });
        if (reauthError) {
          throw new Error("Current password is incorrect");
        }
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;

        setPasswordSaved(true);
        setTimeout(() => setPasswordSaved(false), 2000);
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to change password";
      setPasswordError(message);
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-[13px] text-muted">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Settings</h1>
        </div>
        <div className="bg-amber-50 text-amber-800 border border-amber-100 rounded-xl p-3 text-[13px]">
          Your profile could not be loaded. Please log out and sign up again, or contact your admin.
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={fetchSettings}>
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">Settings</h1>
      </div>

      <div className="space-y-4">
        <div className="bg-card rounded-2xl border border-border/40 p-4 shadow-sm">
          <h2 className="text-[14px] font-semibold mb-3 flex items-center gap-1.5">
            <User className="w-4 h-4 text-primary" />
            My Profile
          </h2>

          {profileSaved && (
            <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl p-2.5 mb-3 flex items-center gap-2 text-[13px]">
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Profile updated
            </div>
          )}

          {profileError && (
            <div className="bg-red-50 text-danger border border-red-100 rounded-xl p-2.5 mb-3 text-[13px]">
              {profileError}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div>
              <label className="block text-[13px] font-medium mb-1">Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-1">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-1">Contact</label>
              <input
                type="tel"
                value={editContact}
                onChange={(e) => setEditContact(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-1.5 px-4 py-2 gradient-bg text-white shadow-sm shadow-primary/20 rounded-lg text-[13px] font-medium hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>

        <div className="bg-card rounded-2xl border border-border/40 p-4 shadow-sm">
          <h2 className="text-[14px] font-semibold mb-3 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-primary" />
            Change Password
          </h2>

          {passwordSaved && (
            <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl p-2.5 mb-3 flex items-center gap-2 text-[13px]">
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Password changed
            </div>
          )}

          {passwordError && (
            <div className="bg-red-50 text-danger border border-red-100 rounded-xl p-2.5 mb-3 text-[13px]">
              {passwordError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-[13px] font-medium mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
                placeholder="Min 6 characters"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
                placeholder="Confirm new password"
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="flex items-center gap-1.5 px-4 py-2 gradient-bg text-white shadow-sm shadow-primary/20 rounded-lg text-[13px] font-medium hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              {savingPassword ? "Changing..." : "Change Password"}
            </button>
          </form>
        </div>

        {settings && (
          <div className="bg-card rounded-2xl border border-border/40 p-4 shadow-sm">
            <h2 className="text-[14px] font-semibold mb-1 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-primary" />
              Invitation Codes
            </h2>
            <p className="text-[12px] text-muted mb-4">
              {isAdmin
                ? "Share these codes to let people sign up."
                : "Share this code to invite new members."}
            </p>

            <div className="space-y-3">
              {isAdmin && settings.admin_code && (
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
                label="Member Code"
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
        )}

        {isAdmin && (
          <div className="bg-card rounded-2xl border border-border/40 p-4 shadow-sm">
            <h2 className="text-[14px] font-semibold mb-3 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary" />
              Team Members ({members.length})
            </h2>

            {removeError && (
              <div className="bg-red-50 text-danger border border-red-100 rounded-xl p-2.5 mb-3 text-[13px]">
                {removeError}
              </div>
            )}

            <div className="divide-y divide-border/40">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium">{m.name}</span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase ${
                          m.role === "admin"
                            ? "bg-primary/10 text-primary"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {m.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">
                      {m.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted hidden sm:block">
                      {format(new Date(m.created_at), "dd MMM yy")}
                    </span>
                    {m.id !== profile?.id && (
                      <button
                        onClick={() => setRemoveId(m.id)}
                        className="p-1 rounded-lg text-muted hover:text-danger hover:bg-red-50 transition-colors"
                        title="Remove member"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border/40 p-4 shadow-sm">
          <h2 className="text-[14px] font-semibold mb-3 flex items-center gap-1.5">
            <Type className="w-4 h-4 text-primary" />
            Font Size
          </h2>
          <p className="text-[12px] text-muted mb-3">
            Adjust text size across the app.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {FONT_SIZES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setFontSize(opt.value);
                  setFontSizeState(opt.value);
                }}
                className={`py-2 rounded-xl text-center font-medium transition-all ${
                  fontSize === opt.value
                    ? "gradient-bg text-white shadow-sm shadow-primary/20"
                    : "bg-gray-50 text-foreground border border-border/60 hover:border-primary/30"
                }`}
                style={{ fontSize: ({ small: 11, medium: 13, large: 15, xlarge: 17 })[opt.value] }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {removeId && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-xs w-full animate-slide-up">
            <h3 className="text-[15px] font-semibold mb-1.5">Remove Member</h3>
            <p className="text-[13px] text-muted mb-5">
              Are you sure? They will no longer be able to access the app.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRemoveMember(removeId)}
                className="flex-1 bg-danger text-white py-2 rounded-xl text-[13px] font-medium hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
              <button
                onClick={() => setRemoveId(null)}
                className="flex-1 border border-border py-2 rounded-xl text-[13px] font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
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
      className={`rounded-xl border p-3 ${
        variant === "admin"
          ? "border-primary/20 bg-primary/5"
          : "border-border/60 bg-gray-50"
      }`}
    >
      <label className="block text-[13px] font-medium mb-1.5">{label}</label>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 px-3 py-2 bg-white border border-border/60 rounded-lg font-mono text-[13px] tracking-wider select-all">
          {show ? code : "••••••••"}
        </div>
        <button
          onClick={onToggleShow}
          className="p-2 rounded-lg border border-border/60 hover:bg-gray-100 transition-colors"
          title={show ? "Hide" : "Show"}
        >
          {show ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={onCopy}
          className="p-2 rounded-lg border border-border/60 hover:bg-gray-100 transition-colors"
          title="Copy"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
        {canRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="p-2 rounded-lg border border-border/60 hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Generate new code"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`}
            />
          </button>
        )}
      </div>
    </div>
  );
}

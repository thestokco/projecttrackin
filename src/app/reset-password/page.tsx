"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, ClipboardList, CheckCircle, ArrowRight } from "lucide-react";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        setTimeout(() => {
          setSessionError(true);
        }, 3000);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/form");
    }, 2000);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pattern-dots">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="bg-card rounded-2xl shadow-lg border border-border/40 p-6 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold mb-1">Password Updated</h2>
            <p className="text-[13px] text-muted">Redirecting you to the app...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionReady && !sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pattern-dots">
        <div className="text-[13px] text-muted">Verifying reset link...</div>
      </div>
    );
  }

  if (sessionError && !sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pattern-dots">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="bg-card rounded-2xl shadow-lg border border-border/40 p-6 text-center">
            <h2 className="text-lg font-bold mb-2">Invalid or Expired Link</h2>
            <p className="text-[13px] text-muted mb-4">
              This reset link is no longer valid. Please request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-1.5 gradient-bg text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold hover:opacity-90 transition-all shadow-md shadow-primary/20"
            >
              Request New Link
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pattern-dots">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold gradient-text">Project Tracker</h1>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border/40 p-6">
          <h2 className="text-lg font-bold mb-1">Set New Password</h2>
          <p className="text-muted text-[13px] mb-6">
            Enter your new password below.
          </p>

          {error && (
            <div className="bg-red-50 text-danger border border-red-100 rounded-xl p-2.5 mb-4 text-[13px] flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-danger rounded-full flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all"
                  placeholder="Min 6 characters"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-bg text-white py-2.5 rounded-xl text-[13px] font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-primary/20"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

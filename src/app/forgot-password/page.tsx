"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Mail, ArrowLeft, ClipboardList, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message || "Failed to send reset email. Please try again later.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
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
          <h2 className="text-lg font-bold mb-1">Forgot Password</h2>
          <p className="text-muted text-[13px] mb-6">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>

          {sent ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl p-3 flex items-center gap-2 text-[13px]">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Reset link sent! Check your email inbox.
              </div>
              <p className="text-[12px] text-muted text-center">
                Didn&apos;t receive it? Check your spam folder or try again.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="w-full border border-border py-2.5 rounded-xl text-[13px] font-medium hover:bg-gray-50 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 text-danger border border-red-100 rounded-xl p-2.5 mb-4 text-[13px] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-danger rounded-full flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-3 py-2.5 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full gradient-bg text-white py-2.5 rounded-xl text-[13px] font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-primary/20"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-[13px] text-muted mt-5">
            <Link href="/login" className="text-primary font-semibold hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

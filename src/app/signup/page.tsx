"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, User, Mail, Phone, Lock, ArrowRight, ClipboardList } from "lucide-react";

export default function SignupPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!inviteCode.trim()) {
      setError("Invitation code is required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const trimmedCode = inviteCode.trim();

    const { data: roleResult, error: rpcError } = await supabase.rpc(
      "validate_invite_code",
      { code: trimmedCode }
    );

    if (rpcError) {
      setError("Unable to verify invitation code. Please try again.");
      setLoading(false);
      return;
    }

    if (!roleResult) {
      setError("Invalid invitation code");
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          contact_no: contactNo,
          invite_code: trimmedCode,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push("/form");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pattern-dots py-8">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 gradient-bg rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">Project Tracker</h1>
        </div>

        <div className="bg-card rounded-2xl shadow-xl shadow-primary/5 border border-border/50 p-8">
          <h2 className="text-2xl font-bold mb-2">Create Account</h2>
          <p className="text-muted text-sm mb-6">Join your team with an invitation code</p>

          {error && (
            <div className="bg-red-50 text-danger border border-red-200 rounded-xl p-3 mb-6 text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-danger rounded-full flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="bg-primary-light/50 rounded-xl p-4 border border-primary/10">
              <label className="block text-sm font-semibold mb-2 flex items-center gap-1.5 text-primary">
                <KeyRound className="w-4 h-4" />
                Invitation Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                className="w-full px-4 py-3 border border-primary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono tracking-wider uppercase bg-white"
                placeholder="Enter code from admin"
              />
              <p className="text-xs text-muted mt-1.5">Get this code from your team admin</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                    className="w-full pl-11 pr-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50"
                    placeholder="John Doe" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className="w-full pl-11 pr-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50"
                    placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Contact No.</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input type="tel" value={contactNo} onChange={(e) => setContactNo(e.target.value)} required
                    className="w-full pl-11 pr-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50"
                    placeholder="+60 12-345 6789" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="w-full pl-11 pr-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50"
                    placeholder="Min 6 characters" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                    className="w-full pl-11 pr-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background/50"
                    placeholder="Confirm password" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full gradient-bg text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/25 mt-2">
              {loading ? "Creating account..." : (<>Sign Up <ArrowRight className="w-4 h-4" /></>)}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

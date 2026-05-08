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
    <div className="min-h-screen flex items-center justify-center px-4 pattern-dots py-6">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex items-center gap-2.5 mb-5 justify-center">
          <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold gradient-text">Project Tracker</h1>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border/40 p-6">
          <h2 className="text-lg font-bold mb-1">Create Account</h2>
          <p className="text-muted text-[13px] mb-5">Join your team with an invitation code</p>

          {error && (
            <div className="bg-red-50 text-danger border border-red-100 rounded-xl p-2.5 mb-4 text-[13px] flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-danger rounded-full flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-3.5">
            <div className="bg-primary-light/60 rounded-xl p-3 border border-primary/10">
              <label className="flex items-center gap-1.5 text-[13px] font-semibold mb-1.5 text-primary">
                <KeyRound className="w-3.5 h-3.5" />
                Invitation Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                className="w-full px-3 py-2 border border-primary/15 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary font-mono tracking-wider uppercase bg-white"
                placeholder="ENTER CODE FROM ADMIN"
              />
              <p className="text-[11px] text-muted mt-1">Get this code from your team admin</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[13px] font-medium mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                    className="w-full pl-10 pr-3 py-2.5 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
                    placeholder="John Doe" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="w-full pl-9 pr-2 py-2.5 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
                      placeholder="you@email.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-1.5">Contact No.</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                    <input type="tel" value={contactNo} onChange={(e) => setContactNo(e.target.value)} required
                      className="w-full pl-9 pr-2 py-2.5 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
                      placeholder="+60 12-345" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                      className="w-full pl-9 pr-2 py-2.5 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
                      placeholder="Min 6 chars" />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-1.5">Confirm</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                      className="w-full pl-9 pr-2 py-2.5 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
                      placeholder="Confirm" />
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full gradient-bg text-white py-2.5 rounded-xl text-[13px] font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-primary/20 mt-1">
              {loading ? "Creating account..." : (<>Sign Up <ArrowRight className="w-3.5 h-3.5" /></>)}
            </button>
          </form>

          <p className="text-center text-[13px] text-muted mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

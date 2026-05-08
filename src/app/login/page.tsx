"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, ClipboardList, Users, BarChart3 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/form");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 gradient-bg relative overflow-hidden items-center justify-center p-10">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-purple-300 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 text-white max-w-sm">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Project Tracker</h1>
          <p className="text-sm text-white/70 mb-8 leading-relaxed">
            Track submissions, manage your team, and stay on top of every project.
          </p>

          <div className="space-y-3">
            {[
              { icon: ClipboardList, title: "Easy Submissions", desc: "Submit and track with photos" },
              { icon: Users, title: "Team Management", desc: "Invite and manage members" },
              { icon: BarChart3, title: "Real-time Dashboard", desc: "Insights at a glance" },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-[13px]">{item.title}</p>
                  <p className="text-[11px] text-white/50">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 pattern-dots">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="lg:hidden flex items-center gap-2.5 mb-6 justify-center">
            <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold gradient-text">Project Tracker</h1>
          </div>

          <div className="bg-card rounded-2xl shadow-lg border border-border/40 p-6">
            <h2 className="text-lg font-bold mb-1">Welcome back</h2>
            <p className="text-muted text-[13px] mb-6">Sign in to your account to continue</p>

            {error && (
              <div className="bg-red-50 text-danger border border-red-100 rounded-xl p-2.5 mb-4 text-[13px] flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-danger rounded-full flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
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

              <div>
                <label className="block text-[13px] font-medium mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-3 py-2.5 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full gradient-bg text-white py-2.5 rounded-xl text-[13px] font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-primary/20"
              >
                {loading ? "Signing in..." : (
                  <>Sign In <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </form>

            <p className="text-center text-[13px] text-muted mt-5">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary font-semibold hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

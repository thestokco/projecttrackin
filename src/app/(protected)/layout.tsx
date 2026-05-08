"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockStore } from "@/lib/mock-store";
import { UserProvider, useUser } from "@/lib/user-context";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import InstallPrompt from "@/components/InstallPrompt";
import {
  ClipboardList,
  FileText,
  Database,
  BarChart3,
  LogOut,
  Menu,
  X,
  Shield,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/form", label: "Form", icon: ClipboardList },
  { href: "/my-submissions", label: "My Submissions", icon: FileText },
  { href: "/all-data", label: "All Data", icon: Database },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
];

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <LayoutShell>{children}</LayoutShell>
    </UserProvider>
  );
}

function LayoutShell({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isDemo = mockStore.isDemoMode();

  async function handleLogout() {
    if (!isDemo) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="glass-dark sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-[15px] text-white hidden sm:block">
                Project Tracker
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              {profile && (
                <span className="text-[13px] text-white/70 hidden sm:flex items-center gap-1">
                  {isAdmin && <Shield className="w-3 h-3 text-amber-300" />}
                  {profile.name}
                </span>
              )}
              {isDemo && (
                <span className="text-[10px] bg-amber-400/20 text-amber-200 px-1.5 py-0.5 rounded-full font-medium hidden sm:block">
                  Demo
                </span>
              )}
              <Link
                href="/settings"
                className={`hidden md:flex items-center p-1.5 rounded-lg transition-all ${
                  pathname.startsWith("/settings")
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <Settings className="w-4 h-4" />
              </Link>
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 text-white/80 hover:text-white"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-primary/95 backdrop-blur-xl animate-fade-in">
            <div className="px-3 py-2 space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                  pathname.startsWith("/settings")
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-red-300 hover:bg-white/10 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 pb-20 md:pb-4">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-border/30 z-50">
        <div className="flex items-center justify-around h-14 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-medium transition-all ${
                  isActive
                    ? "text-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <div className={`p-1 rounded-lg transition-all ${isActive ? "bg-primary/10" : ""}`}>
                  <Icon className={`w-[18px] h-[18px] ${isActive ? "stroke-[2.5]" : ""}`} />
                </div>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <InstallPrompt />
    </div>
  );
}

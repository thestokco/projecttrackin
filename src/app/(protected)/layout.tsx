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
  { href: "/my-submissions", label: "My Submission", icon: FileText },
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
    <div className="min-h-screen flex flex-col">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg hidden sm:block">
                Project Tracker
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted hover:text-foreground hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              {profile && (
                <span className="text-sm text-muted hidden sm:flex items-center gap-1.5">
                  {isAdmin && <Shield className="w-3.5 h-3.5 text-primary" />}
                  {profile.name}
                </span>
              )}
              {isDemo && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium hidden sm:block">
                  Demo
                </span>
              )}
              {isAdmin && (
                <Link
                  href="/settings"
                  className={`hidden md:flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                    pathname.startsWith("/settings")
                      ? "text-primary bg-primary/10"
                      : "text-muted hover:text-foreground hover:bg-gray-100"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-danger rounded-lg hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-muted hover:text-foreground"
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
          <div className="md:hidden border-t border-border bg-card">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted hover:text-foreground hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith("/settings")
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:text-foreground hover:bg-gray-100"
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  Settings
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-danger hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2 px-2 text-[10px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="md:hidden h-16" />

      <InstallPrompt />
    </div>
  );
}

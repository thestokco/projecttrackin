"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockStore } from "@/lib/mock-store";
import type { Submission, Profile } from "@/lib/types";
import { parseDate } from "@/lib/date";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { Users, Cable, Calendar } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";

export default function DashboardPage() {
  const isDemo = mockStore.isDemoMode();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM")
  );
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const monthDate = new Date(selectedMonth + "-01");
    const start = format(startOfMonth(monthDate), "yyyy-MM-dd");
    const end = format(endOfMonth(monthDate), "yyyy-MM-dd");

    if (isDemo) {
      const allSubs = mockStore.getSubmissions();
      const filtered = allSubs.filter(
        (s) => s.submission_date >= start && s.submission_date <= end
      );
      setSubmissions(filtered);
      setProfiles(mockStore.getProfiles());
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const [subsResult, profilesResult] = await Promise.all([
      supabase
        .from("submissions")
        .select("*")
        .gte("submission_date", start)
        .lte("submission_date", end),
      supabase.from("profiles").select("*"),
    ]);

    setSubmissions(subsResult.data || []);
    setProfiles(profilesResult.data || []);
    setLoading(false);
  }, [selectedMonth, isDemo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isDemo) {
      return mockStore.subscribe(() => fetchData());
    }

    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, isDemo]);

  const months = eachMonthOfInterval({
    start: subMonths(new Date(), 11),
    end: new Date(),
  }).reverse();

  const pendingCableReturn = submissions.filter((s) => !s.cable_return);

  const submissionsByUser: Record<string, number> = {};
  submissions.forEach((s) => {
    submissionsByUser[s.user_name] =
      (submissionsByUser[s.user_name] || 0) + 1;
  });

  return (
    <PullToRefresh onRefresh={fetchData}>
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {months.map((m) => (
              <option key={format(m, "yyyy-MM")} value={format(m, "yyyy-MM")}>
                {format(m, "MMMM yyyy")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              icon={<Users className="w-5 h-5" />}
              label="Total Submissions"
              value={submissions.length}
              color="from-indigo-500 to-purple-500"
            />
            <StatCard
              icon={<Users className="w-5 h-5" />}
              label="Team Members"
              value={profiles.length}
              color="from-emerald-500 to-teal-500"
            />
            <StatCard
              icon={<Cable className="w-5 h-5" />}
              label="Pending Cable Return"
              value={pendingCableReturn.length}
              color="from-rose-500 to-pink-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Cable className="w-5 h-5 text-red-500" />
                Pending Cable Returns
              </h2>
              {pendingCableReturn.length === 0 ? (
                <p className="text-sm text-muted py-4">
                  All cables have been returned for this month.
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {pendingCableReturn.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-4 py-3 bg-red-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {s.application_number}
                        </p>
                        <p className="text-xs text-muted">
                          By {s.user_name} on{" "}
                          {format(
                            parseDate(s.submission_date),
                            "dd MMM yyyy"
                          )}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
                        Not returned
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm lg:col-span-2">
              <h2 className="text-lg font-semibold mb-4">
                Submissions by Member
              </h2>
              {Object.keys(submissionsByUser).length === 0 ? (
                <p className="text-sm text-muted py-4">
                  No submissions for this month.
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(submissionsByUser)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, count]) => {
                      const max = Math.max(
                        ...Object.values(submissionsByUser)
                      );
                      const pct = (count / max) * 100;
                      return (
                        <div key={name} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{name}</span>
                            <span className="text-muted">
                              {count} submission{count !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
    </PullToRefresh>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`rounded-2xl p-5 bg-gradient-to-br ${color} text-white shadow-lg card-hover`}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
          {icon}
        </div>
        <div>
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-xs text-white/80">{label}</p>
        </div>
      </div>
    </div>
  );
}

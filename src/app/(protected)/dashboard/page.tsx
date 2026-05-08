"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockStore } from "@/lib/mock-store";
import type { Submission, Profile } from "@/lib/types";
import { parseDate } from "@/lib/date";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { Users, Cable, Calendar, TrendingUp } from "lucide-react";
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
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-lg font-bold">Dashboard</h1>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2.5 py-1.5 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 bg-card"
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
        <div className="text-center py-16 text-[13px] text-muted">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Submissions"
              value={submissions.length}
              color="from-stone-500 to-stone-700"
            />
            <StatCard
              icon={<Users className="w-4 h-4" />}
              label="Members"
              value={profiles.length}
              color="from-emerald-500 to-teal-500"
            />
            <StatCard
              icon={<Cable className="w-4 h-4" />}
              label="Pending"
              value={pendingCableReturn.length}
              color="from-rose-500 to-pink-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl border border-border/40 p-4 shadow-sm">
              <h2 className="text-[14px] font-semibold mb-3 flex items-center gap-1.5">
                <Cable className="w-4 h-4 text-rose-500" />
                Pending Cable Returns
              </h2>
              {pendingCableReturn.length === 0 ? (
                <p className="text-[13px] text-muted py-3">
                  All cables returned for this month.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {pendingCableReturn.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-3 py-2.5 bg-rose-50 rounded-xl"
                    >
                      <div>
                        <p className="text-[13px] font-medium">
                          {s.application_number}
                        </p>
                        <p className="text-[11px] text-muted">
                          {s.user_name} &middot;{" "}
                          {format(parseDate(s.submission_date), "dd MMM yyyy")}
                        </p>
                      </div>
                      <span className="text-[10px] font-medium text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card rounded-2xl border border-border/40 p-4 shadow-sm lg:col-span-2">
              <h2 className="text-[14px] font-semibold mb-3">
                Submissions by Member
              </h2>
              {Object.keys(submissionsByUser).length === 0 ? (
                <p className="text-[13px] text-muted py-3">
                  No submissions for this month.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(submissionsByUser)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, count]) => {
                      const max = Math.max(
                        ...Object.values(submissionsByUser)
                      );
                      const pct = (count / max) * 100;
                      return (
                        <div key={name} className="space-y-1">
                          <div className="flex items-center justify-between text-[13px]">
                            <span className="font-medium">{name}</span>
                            <span className="text-muted text-[12px]">
                              {count} submission{count !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full gradient-bg rounded-full transition-all"
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
    <div className={`stat-card rounded-2xl p-3.5 bg-gradient-to-br ${color} text-white shadow-md card-hover`}>
      <div className="flex flex-col gap-1">
        <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
          {icon}
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
        <p className="text-[10px] text-white/70 font-medium">{label}</p>
      </div>
    </div>
  );
}

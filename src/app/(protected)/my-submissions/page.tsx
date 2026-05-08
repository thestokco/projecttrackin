"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockStore } from "@/lib/mock-store";
import { useUser } from "@/lib/user-context";
import type { Submission } from "@/lib/types";
import { parseDate } from "@/lib/date";
import { format } from "date-fns";
import { Pencil, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import PullToRefresh from "@/components/PullToRefresh";

export default function MySubmissionsPage() {
  const router = useRouter();
  const { profile } = useUser();
  const isDemo = mockStore.isDemoMode();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    if (isDemo) {
      setSubmissions(mockStore.getUserSubmissions(profile.id));
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data } = await supabase
      .from("submissions")
      .select("*")
      .eq("user_id", profile.id)
      .order("submission_date", { ascending: false });

    setSubmissions(data || []);
    setLoading(false);
  }, [profile, isDemo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isDemo) {
      return mockStore.subscribe(() => fetchData());
    }

    const supabase = createClient();
    const channel = supabase
      .channel("my-submissions-realtime")
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

  async function downloadPhotos(e: React.MouseEvent, photos: string[], appNumber: string) {
    e.stopPropagation();
    for (let i = 0; i < photos.length; i++) {
      const url = photos[i];
      const ext = url.split(".").pop()?.split("?")[0] || "jpg";
      const filename = `${appNumber}_${i + 1}.${ext}`;
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
      } catch {
        window.open(url, "_blank");
      }
    }
  }

  return (
    <PullToRefresh onRefresh={fetchData}>
    <div>
      <h1 className="text-2xl font-bold mb-6">My Submissions</h1>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Completion Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Application No.
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Cable Return
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Photos
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    Loading...
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    No submissions yet
                  </td>
                </tr>
              ) : (
                submissions.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/my-submissions/${s.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm">
                      {format(parseDate(s.submission_date), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {format(parseDate(s.completion_date), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {s.application_number}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          s.cable_return
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {s.cable_return ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.photos && s.photos.length > 0 ? (
                        <button
                          onClick={(e) => downloadPhotos(e, s.photos, s.application_number)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {s.photos.length} Photos
                        </button>
                      ) : (
                        <span className="text-sm text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/my-submissions/${s.id}/edit`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </PullToRefresh>
  );
}

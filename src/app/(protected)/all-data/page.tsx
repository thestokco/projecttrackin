"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockStore } from "@/lib/mock-store";
import { useUser } from "@/lib/user-context";
import type { Submission } from "@/lib/types";
import { format } from "date-fns";
import {
  ArrowUpDown,
  Download,
  Filter,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

type SortKey = keyof Pick<
  Submission,
  | "user_name"
  | "completion_date"
  | "application_number"
  | "cable_return"
  | "cable_return_date"
  | "submission_date"
>;

export default function AllDataPage() {
  const router = useRouter();
  const { isAdmin } = useUser();
  const isDemo = mockStore.isDemoMode();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("submission_date");
  const [sortAsc, setSortAsc] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const perPage = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);

    if (isDemo) {
      let data = mockStore.getSubmissions();
      if (dateFrom) data = data.filter((s) => s.submission_date >= dateFrom);
      if (dateTo) data = data.filter((s) => s.submission_date <= dateTo);

      data.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (aVal < bVal) return sortAsc ? -1 : 1;
        if (aVal > bVal) return sortAsc ? 1 : -1;
        return 0;
      });

      setSubmissions(data);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    let query = supabase
      .from("submissions")
      .select("*")
      .order(sortKey, { ascending: sortAsc });

    if (dateFrom) query = query.gte("submission_date", dateFrom);
    if (dateTo) query = query.lte("submission_date", dateTo);

    const { data } = await query;
    setSubmissions(data || []);
    setLoading(false);
  }, [sortKey, sortAsc, dateFrom, dateTo, isDemo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isDemo) {
      return mockStore.subscribe(() => fetchData());
    }

    const supabase = createClient();
    const channel = supabase
      .channel("all-data-realtime")
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

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
    setPage(1);
  }

  async function handleDelete(id: string) {
    if (isDemo) {
      mockStore.deleteSubmission(id);
    } else {
      const supabase = createClient();
      await supabase.from("submissions").delete().eq("id", id);
    }
    setDeleteId(null);
  }

  function exportExcel() {
    const exportData = submissions.map((s) => ({
      Name: s.user_name,
      "Submission Date": s.submission_date,
      "Submission Time": s.submission_time,
      "Completion Date": s.completion_date,
      "Application Number": s.application_number,
      "Cable Return": s.cable_return ? "Yes" : "No",
      "Cable Return Date": s.cable_return_date || "-",
      "Photo Count": s.photos?.length || 0,
      Remark: s.remark || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Submissions");
    XLSX.writeFile(wb, `all_data_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  }

  const filteredData = searchQuery
    ? submissions.filter(
        (s) =>
          s.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.application_number.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : submissions;

  const totalPages = Math.ceil(filteredData.length / perPage);
  const paginatedData = filteredData.slice(
    (page - 1) * perPage,
    page * perPage
  );

  const colSpan = isAdmin ? 7 : 6;

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

  function SortHeader({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) {
    return (
      <th
        className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground select-none"
        onClick={() => handleSort(sortKeyName)}
      >
        <div className="flex items-center gap-1">
          {label}
          <ArrowUpDown className={`w-3 h-3 ${sortKey === sortKeyName ? "text-primary" : ""}`} />
        </div>
      </th>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">All Data</h1>
        <button
          onClick={exportExcel}
          disabled={submissions.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export Excel
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Search by name or application number..."
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Filter className="w-4 h-4 text-muted flex-shrink-0" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
            <label className="text-sm text-muted whitespace-nowrap">Date range:</label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <span className="text-muted text-sm">to</span>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }} className="text-sm text-primary hover:underline">Clear</button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <SortHeader label="Name" sortKeyName="user_name" />
                <SortHeader label="Completion Date" sortKeyName="completion_date" />
                <SortHeader label="Application No." sortKeyName="application_number" />
                <SortHeader label="Cable Return" sortKeyName="cable_return" />
                <SortHeader label="Cable Return Date" sortKeyName="cable_return_date" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Photos</th>
                {isAdmin && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={colSpan} className="px-4 py-12 text-center text-muted">Loading...</td></tr>
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan={colSpan} className="px-4 py-12 text-center text-muted">No submissions found</td></tr>
              ) : (
                paginatedData.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/all-data/${s.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-primary">{s.user_name}</td>
                    <td className="px-4 py-3 text-sm">
                      {s.completion_date ? format(new Date(s.completion_date), "dd MMM yyyy") : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">{s.application_number}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cable_return ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {s.cable_return ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {s.cable_return_date ? format(new Date(s.cable_return_date), "dd MMM yyyy") : "-"}
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
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-danger bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted">
              Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filteredData.length)} of {filteredData.length}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Delete Submission</h3>
            <p className="text-sm text-muted mb-6">
              Are you sure you want to delete this submission? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 bg-danger text-white py-2 rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border border-border py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

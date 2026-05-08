"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockStore } from "@/lib/mock-store";
import { useUser } from "@/lib/user-context";
import type { Submission } from "@/lib/types";
import { parseDate } from "@/lib/date";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  ArrowUpDown,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import PullToRefresh from "@/components/PullToRefresh";
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
  const [selectedMonth, setSelectedMonth] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const monthOptions = (() => {
    const options: { value: string; label: string }[] = [{ value: "", label: "All Months" }];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(new Date(), i);
      options.push({ value: format(d, "yyyy-MM"), label: format(d, "MMM yyyy") });
    }
    return options;
  })();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const perPage = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);

    let filterFrom = dateFrom;
    let filterTo = dateTo;
    if (selectedMonth) {
      const monthDate = new Date(selectedMonth + "-01");
      filterFrom = format(startOfMonth(monthDate), "yyyy-MM-dd");
      filterTo = format(endOfMonth(monthDate), "yyyy-MM-dd");
    }

    if (isDemo) {
      let data = mockStore.getSubmissions();
      if (filterFrom) data = data.filter((s) => s.submission_date >= filterFrom);
      if (filterTo) data = data.filter((s) => s.submission_date <= filterTo);

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

    if (filterFrom) query = query.gte("submission_date", filterFrom);
    if (filterTo) query = query.lte("submission_date", filterTo);

    const { data } = await query;
    setSubmissions(data || []);
    setLoading(false);
  }, [sortKey, sortAsc, dateFrom, dateTo, selectedMonth, isDemo]);

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
        className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground select-none"
        onClick={() => handleSort(sortKeyName)}
      >
        <div className="flex items-center gap-1">
          {label}
          <ArrowUpDown className={`w-2.5 h-2.5 ${sortKey === sortKeyName ? "text-primary" : ""}`} />
        </div>
      </th>
    );
  }

  return (
    <PullToRefresh onRefresh={fetchData}>
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-lg font-bold">All Data</h1>
        <button
          onClick={exportExcel}
          disabled={submissions.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[12px] font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border/40 shadow-sm p-3 mb-3">
        <div className="relative mb-2.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Search name or app number..."
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted flex-shrink-0" />
          <select
            value={selectedMonth}
            onChange={(e) => { setSelectedMonth(e.target.value); setDateFrom(""); setDateTo(""); setPage(1); }}
            className="px-2.5 py-1.5 border border-border rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/15 bg-white"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {!selectedMonth && (
            <>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="px-2 py-1.5 border border-border rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/15" />
              <span className="text-muted text-[12px]">to</span>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="px-2 py-1.5 border border-border rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/15" />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }} className="text-[12px] text-primary hover:underline">Clear</button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50/80 border-b border-border/60">
              <tr>
                <SortHeader label="Name" sortKeyName="user_name" />
                <SortHeader label="Completion" sortKeyName="completion_date" />
                <SortHeader label="App No." sortKeyName="application_number" />
                <SortHeader label="Cable" sortKeyName="cable_return" />
                <SortHeader label="Return Date" sortKeyName="cable_return_date" />
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted uppercase tracking-wider">Photos</th>
                {isAdmin && (
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted uppercase tracking-wider">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr><td colSpan={colSpan} className="px-3 py-10 text-center text-[13px] text-muted">Loading...</td></tr>
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan={colSpan} className="px-3 py-10 text-center text-[13px] text-muted">No submissions found</td></tr>
              ) : (
                paginatedData.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/all-data/${s.id}`)}
                    className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                  >
                    <td className="px-3 py-2.5 text-[13px] font-medium text-primary">{s.user_name}</td>
                    <td className="px-3 py-2.5 text-[13px]">
                      {s.completion_date ? format(parseDate(s.completion_date), "dd MMM yy") : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] font-mono">{s.application_number}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cable_return ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                        {s.cable_return ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[13px]">
                      {s.cable_return_date ? format(parseDate(s.cable_return_date), "dd MMM yy") : "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      {s.photos && s.photos.length > 0 ? (
                        <button
                          onClick={(e) => downloadPhotos(e, s.photos, s.application_number)}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          {s.photos.length}
                        </button>
                      ) : (
                        <span className="text-[13px] text-muted">-</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-3 py-2.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
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
          <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/40">
            <span className="text-[12px] text-muted">
              {(page - 1) * perPage + 1}-{Math.min(page * perPage, filteredData.length)} of {filteredData.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[12px] font-medium">{page}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-xs w-full animate-slide-up">
            <h3 className="text-[15px] font-semibold mb-1.5">Delete Submission</h3>
            <p className="text-[13px] text-muted mb-5">
              Are you sure? This action cannot be undone.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 bg-danger text-white py-2 rounded-xl text-[13px] font-medium hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border border-border py-2 rounded-xl text-[13px] font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}

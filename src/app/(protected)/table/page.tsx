"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockStore } from "@/lib/mock-store";
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

export default function TablePage() {
  const router = useRouter();
  const isDemo = mockStore.isDemoMode();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("submission_date");
  const [sortAsc, setSortAsc] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
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
      .channel("submissions-realtime")
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
    XLSX.writeFile(
      wb,
      `submissions_${format(new Date(), "yyyy-MM-dd")}.xlsx`
    );
  }

  const filteredData = searchQuery
    ? submissions.filter((s) =>
        s.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.application_number.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : submissions;

  const totalPages = Math.ceil(filteredData.length / perPage);
  const paginatedData = filteredData.slice(
    (page - 1) * perPage,
    page * perPage
  );

  function SortHeader({
    label,
    sortKeyName,
  }: {
    label: string;
    sortKeyName: SortKey;
  }) {
    return (
      <th
        className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground select-none"
        onClick={() => handleSort(sortKeyName)}
      >
        <div className="flex items-center gap-1">
          {label}
          <ArrowUpDown
            className={`w-3 h-3 ${sortKey === sortKeyName ? "text-primary" : ""}`}
          />
        </div>
      </th>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Submissions</h1>
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
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or application number..."
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Filter className="w-4 h-4 text-muted flex-shrink-0" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
            <label className="text-sm text-muted whitespace-nowrap">
              Date range:
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="text-muted text-sm">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
                className="text-sm text-primary hover:underline"
              >
                Clear
              </button>
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
                <SortHeader
                  label="Completion Date"
                  sortKeyName="completion_date"
                />
                <SortHeader
                  label="Application No."
                  sortKeyName="application_number"
                />
                <SortHeader
                  label="Cable Return"
                  sortKeyName="cable_return"
                />
                <SortHeader
                  label="Cable Return Date"
                  sortKeyName="cable_return_date"
                />
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Photos
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted"
                  >
                    Loading...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted"
                  >
                    No submissions found
                  </td>
                </tr>
              ) : (
                paginatedData.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/table/${s.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-primary">
                      {s.user_name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {s.completion_date
                        ? format(
                            new Date(s.completion_date),
                            "dd MMM yyyy"
                          )
                        : "-"}
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
                    <td className="px-4 py-3 text-sm">
                      {s.cable_return_date
                        ? format(
                            new Date(s.cable_return_date),
                            "dd MMM yyyy"
                          )
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {s.photos && s.photos.length > 0 ? (
                        <span className="flex items-center gap-1 text-sm text-primary">
                          <ImageIcon className="w-4 h-4" />
                          {s.photos.length}
                        </span>
                      ) : (
                        <span className="text-sm text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted">
              Showing {(page - 1) * perPage + 1}-
              {Math.min(page * perPage, filteredData.length)} of{" "}
              {filteredData.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium">
                {page} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

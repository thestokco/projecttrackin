"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockStore } from "@/lib/mock-store";
import { useUser } from "@/lib/user-context";
import type { Submission } from "@/lib/types";
import { parseDate } from "@/lib/date";
import { format } from "date-fns";
import { ArrowLeft, Save, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function EditSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { profile } = useUser();
  const isDemo = mockStore.isDemoMode();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [completionDate, setCompletionDate] = useState("");
  const [applicationNumber, setApplicationNumber] = useState("");
  const [cableReturn, setCableReturn] = useState(false);
  const [cableReturnDate, setCableReturnDate] = useState("");
  const [location, setLocation] = useState("");
  const [remark, setRemark] = useState("");

  useEffect(() => {
    let cancelled = false;

    function applyData(data: Submission) {
      if (profile && data.user_id !== profile.id) {
        setError("You can only edit your own submissions.");
        setSubmission(null);
        return;
      }
      setSubmission(data);
      setCompletionDate(data.completion_date);
      setApplicationNumber(data.application_number);
      setCableReturn(data.cable_return);
      setCableReturnDate(data.cable_return_date || "");
      setLocation(data.location || "");
      setRemark(data.remark || "");
    }

    async function load() {
      if (isDemo) {
        const data = mockStore.getSubmission(id);
        if (data && !cancelled) applyData(data);
        if (!cancelled) setLoading(false);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from("submissions")
        .select("*")
        .eq("id", id)
        .single();
      if (data && !cancelled) applyData(data);
      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, isDemo, profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!submission || !profile) return;

    if (submission.user_id !== profile.id) {
      setError("You can only edit your own submissions.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const updates = {
        completion_date: completionDate,
        application_number: applicationNumber,
        cable_return: cableReturn,
        cable_return_date: cableReturn ? cableReturnDate || null : null,
        location: location || null,
        remark: remark || null,
      };

      if (isDemo) {
        mockStore.updateSubmission(id, updates);
      } else {
        const supabase = createClient();
        const { error: updateError } = await supabase
          .from("submissions")
          .update(updates)
          .eq("id", id);

        if (updateError) throw updateError;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/my-submissions/${id}`);
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="text-[13px] text-muted">Loading...</div></div>;
  }

  if (!submission) {
    return (
      <div className="text-center py-16">
        <p className="text-[13px] text-muted mb-3">Submission not found</p>
        <Link href="/my-submissions" className="text-[13px] text-primary hover:underline">Back to My Submissions</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link href={`/my-submissions/${id}`} className="flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground mb-4">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Details
      </Link>

      <h1 className="text-lg font-bold mb-4">Edit Submission</h1>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl p-3 mb-4 flex items-center gap-2 text-[13px] animate-slide-up">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Saved successfully! Redirecting...
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-danger border border-red-100 rounded-xl p-2.5 mb-4 text-[13px] flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-danger rounded-full flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-card rounded-2xl border border-border/40 p-4 space-y-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium mb-1 text-muted uppercase tracking-wide">Submission Date</label>
              <div className="px-3 py-2 bg-gray-50 border border-border/60 rounded-lg text-[13px]">
                {format(parseDate(submission.submission_date), "dd MMM yyyy")}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1 text-muted uppercase tracking-wide">Name</label>
              <div className="px-3 py-2 bg-gray-50 border border-border/60 rounded-lg text-[13px]">
                {submission.user_name}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium mb-1">
              Completion Date <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium mb-1">
              Application Number <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={applicationNumber}
              onChange={(e) => setApplicationNumber(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium mb-1.5">Cable Return</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCableReturn(false)}
                className={`flex-1 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
                  !cableReturn
                    ? "bg-red-50 border-rose-300 text-rose-600"
                    : "border-border text-muted hover:border-gray-300"
                }`}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setCableReturn(true)}
                className={`flex-1 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
                  cableReturn
                    ? "bg-emerald-50 border-emerald-300 text-emerald-600"
                    : "border-border text-muted hover:border-gray-300"
                }`}
              >
                Yes
              </button>
            </div>
          </div>

          {cableReturn && (
            <div>
              <label className="block text-[13px] font-medium mb-1">Cable Return Date</label>
              <input
                type="date"
                value={cableReturnDate}
                onChange={(e) => setCableReturnDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-[13px] font-medium mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
              placeholder="Enter location"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium mb-1">Remark</label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary resize-none"
              placeholder="Any additional remarks..."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full gradient-bg text-white shadow-md shadow-primary/20 py-2.5 rounded-xl text-[13px] font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

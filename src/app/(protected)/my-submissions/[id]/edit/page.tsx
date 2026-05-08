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
    return <div className="flex items-center justify-center py-20"><div className="text-muted">Loading...</div></div>;
  }

  if (!submission) {
    return (
      <div className="text-center py-20">
        <p className="text-muted mb-4">Submission not found</p>
        <Link href="/my-submissions" className="text-primary hover:underline">Back to My Submissions</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href={`/my-submissions/${id}`} className="flex items-center gap-2 text-sm text-muted hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Details
      </Link>

      <h1 className="text-2xl font-bold mb-6">Edit Submission</h1>

      {success && (
        <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          Saved successfully! Redirecting...
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-danger border border-red-200 rounded-lg p-3 mb-6 text-sm">{error}</div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-card rounded-xl border border-border p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-muted">Submission Date</label>
              <div className="px-4 py-2.5 bg-gray-50 border border-border rounded-lg text-sm">
                {format(parseDate(submission.submission_date), "dd MMM yyyy")}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-muted">Name</label>
              <div className="px-4 py-2.5 bg-gray-50 border border-border rounded-lg text-sm">
                {submission.user_name}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Completion Date <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Application Number <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={applicationNumber}
              onChange={(e) => setApplicationNumber(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cable Return</label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setCableReturn(false)}
                className={`px-6 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  !cableReturn
                    ? "bg-red-50 border-danger text-danger"
                    : "border-border text-muted hover:border-gray-300"
                }`}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setCableReturn(true)}
                className={`px-6 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  cableReturn
                    ? "bg-green-50 border-success text-green-700"
                    : "border-border text-muted hover:border-gray-300"
                }`}
              >
                Yes
              </button>
            </div>
          </div>

          {cableReturn && (
            <div>
              <label className="block text-sm font-medium mb-1">Cable Return Date</label>
              <input
                type="date"
                value={cableReturnDate}
                onChange={(e) => setCableReturnDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Remark</label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              placeholder="Any additional remarks..."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

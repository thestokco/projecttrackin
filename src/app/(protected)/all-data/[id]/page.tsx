"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockStore } from "@/lib/mock-store";
import type { Submission } from "@/lib/types";
import { parseDate } from "@/lib/date";
import { format } from "date-fns";
import { ArrowLeft, Download, Calendar, Clock, User, Hash, Cable } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function DetailPage() {
  const params = useParams();
  const id = params.id as string;
  const isDemo = mockStore.isDemoMode();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      setSubmission(mockStore.getSubmission(id));
      setLoading(false);
      return;
    }

    const supabase = createClient();
    async function fetchSubmission() {
      const { data } = await supabase
        .from("submissions")
        .select("*")
        .eq("id", id)
        .single();

      setSubmission(data);
      setLoading(false);
    }
    fetchSubmission();
  }, [id, isDemo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-20">
        <p className="text-muted mb-4">Submission not found</p>
        <Link href="/all-data" className="text-primary hover:underline">
          Back to All Data
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/all-data"
        className="flex items-center gap-2 text-sm text-muted hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to All Data
      </Link>

      <h1 className="text-2xl font-bold mb-6">Submission Details</h1>

      <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <InfoField
            icon={<Calendar className="w-4 h-4" />}
            label="Submission Date"
            value={format(parseDate(submission.submission_date), "dd MMM yyyy")}
          />
          <InfoField
            icon={<Clock className="w-4 h-4" />}
            label="Submission Time"
            value={submission.submission_time}
          />
          <InfoField
            icon={<User className="w-4 h-4" />}
            label="Name"
            value={submission.user_name}
          />
          <InfoField
            icon={<Calendar className="w-4 h-4" />}
            label="Completion Date"
            value={format(parseDate(submission.completion_date), "dd MMM yyyy")}
          />
          <InfoField
            icon={<Hash className="w-4 h-4" />}
            label="Application Number"
            value={submission.application_number}
          />
          <InfoField
            icon={<Cable className="w-4 h-4" />}
            label="Cable Return"
            value={
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  submission.cable_return
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {submission.cable_return ? "Yes" : "No"}
              </span>
            }
          />
          {submission.cable_return && submission.cable_return_date && (
            <InfoField
              icon={<Calendar className="w-4 h-4" />}
              label="Cable Return Date"
              value={format(parseDate(submission.cable_return_date), "dd MMM yyyy")}
            />
          )}
        </div>

        {submission.remark && (
          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Remark
            </label>
            <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
              {submission.remark}
            </div>
          </div>
        )}

        {submission.photos && submission.photos.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-muted mb-3">
              Photos ({submission.photos.length})
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {submission.photos.map((url, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border group"
                >
                  <img
                    src={url}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <a
                    href={url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >
                    <Download className="w-6 h-6 text-white" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-muted mb-1">
        {icon}
        {label}
      </label>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

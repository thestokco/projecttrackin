"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockStore } from "@/lib/mock-store";
import type { Submission } from "@/lib/types";
import { parseDate } from "@/lib/date";
import { format } from "date-fns";
import { ArrowLeft, Download, Calendar, Clock, User, Hash, Cable, MapPin } from "lucide-react";
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
      <div className="flex items-center justify-center py-16">
        <div className="text-[13px] text-muted">Loading...</div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-16">
        <p className="text-[13px] text-muted mb-3">Submission not found</p>
        <Link href="/all-data" className="text-[13px] text-primary hover:underline">
          Back to All Data
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link
        href="/all-data"
        className="flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to All Data
      </Link>

      <h1 className="text-lg font-bold mb-4">Submission Details</h1>

      <div className="bg-card rounded-2xl border border-border/40 p-4 space-y-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <InfoField
            icon={<Calendar className="w-3.5 h-3.5" />}
            label="Submission Date"
            value={format(parseDate(submission.submission_date), "dd MMM yyyy")}
          />
          <InfoField
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Time"
            value={submission.submission_time}
          />
          <InfoField
            icon={<User className="w-3.5 h-3.5" />}
            label="Name"
            value={submission.user_name}
          />
          <InfoField
            icon={<Calendar className="w-3.5 h-3.5" />}
            label="Completion"
            value={format(parseDate(submission.completion_date), "dd MMM yyyy")}
          />
          <InfoField
            icon={<Hash className="w-3.5 h-3.5" />}
            label="App Number"
            value={submission.application_number}
          />
          <InfoField
            icon={<Cable className="w-3.5 h-3.5" />}
            label="Cable Return"
            value={
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  submission.cable_return
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {submission.cable_return ? "Yes" : "No"}
              </span>
            }
          />
          {submission.cable_return && submission.cable_return_date && (
            <InfoField
              icon={<Calendar className="w-3.5 h-3.5" />}
              label="Return Date"
              value={format(parseDate(submission.cable_return_date), "dd MMM yyyy")}
            />
          )}
        </div>

        {submission.location && (
          <div>
            <label className="flex items-center gap-1 text-[11px] font-medium text-muted mb-0.5 uppercase tracking-wide">
              <MapPin className="w-3.5 h-3.5" />
              Location
            </label>
            <div className="text-[13px] font-medium">{submission.location}</div>
          </div>
        )}

        {submission.remark && (
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1.5 uppercase tracking-wide">
              Remark
            </label>
            <div className="bg-gray-50 rounded-xl p-3 text-[13px] whitespace-pre-wrap">
              {submission.remark}
            </div>
          </div>
        )}

        {submission.photos && submission.photos.length > 0 && (
          <div>
            <label className="block text-[11px] font-medium text-muted mb-2 uppercase tracking-wide">
              Photos ({submission.photos.length})
            </label>
            <div className="grid grid-cols-3 gap-2">
              {submission.photos.map((url, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-xl overflow-hidden border border-border/40 group"
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
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >
                    <Download className="w-5 h-5 text-white" />
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
      <label className="flex items-center gap-1 text-[11px] font-medium text-muted mb-0.5 uppercase tracking-wide">
        {icon}
        {label}
      </label>
      <div className="text-[13px] font-medium">{value}</div>
    </div>
  );
}

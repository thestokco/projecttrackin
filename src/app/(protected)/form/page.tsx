"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockStore } from "@/lib/mock-store";
import { format } from "date-fns";
import { Send, ImagePlus, X, CheckCircle } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";

export default function FormPage() {
  const isDemo = mockStore.isDemoMode();
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [applicationNumber, setApplicationNumber] = useState("");
  const [cableReturn, setCableReturn] = useState(false);
  const [cableReturnDate, setCableReturnDate] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const loadUser = useCallback(async () => {
    if (isDemo) {
      const user = mockStore.getUser();
      setUserName(user.name);
      setUserId(user.id);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    if (profile) {
      setUserName(profile.name);
      setUserId(user.id);
    }
  }, [isDemo]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const MAX_BYTES = 5 * 1024 * 1024;
    const files = Array.from(e.target.files || []);
    const remaining = 5 - photos.length;

    const valid: File[] = [];
    const rejected: string[] = [];
    for (const f of files.slice(0, remaining)) {
      if (!f.type.startsWith("image/")) {
        rejected.push(`${f.name} (not an image)`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        rejected.push(`${f.name} (over 5MB)`);
        continue;
      }
      valid.push(f);
    }

    if (rejected.length) {
      setError(`Skipped: ${rejected.join(", ")}`);
    } else {
      setError("");
    }

    setPhotos((prev) => [...prev, ...valid]);

    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const now = new Date();

      if (isDemo) {
        mockStore.addSubmission({
          user_id: userId,
          user_name: userName,
          submission_date: format(now, "yyyy-MM-dd"),
          submission_time: format(now, "HH:mm:ss"),
          completion_date: completionDate,
          application_number: applicationNumber,
          cable_return: cableReturn,
          cable_return_date: cableReturn ? cableReturnDate || null : null,
          photos: photoPreviews,
          remark: remark || null,
        });
      } else {
        const supabase = createClient();
        const photoUrls: string[] = [];

        for (const photo of photos) {
          const fileExt = photo.name.split(".").pop();
          const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("submission-photos")
            .upload(fileName, photo);

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage
            .from("submission-photos")
            .getPublicUrl(fileName);

          photoUrls.push(publicUrl);
        }

        const { error: insertError } = await supabase
          .from("submissions")
          .insert({
            user_id: userId,
            user_name: userName,
            submission_date: format(now, "yyyy-MM-dd"),
            submission_time: format(now, "HH:mm:ss"),
            completion_date: completionDate,
            application_number: applicationNumber,
            cable_return: cableReturn,
            cable_return_date: cableReturn ? cableReturnDate || null : null,
            photos: photoUrls,
            remark: remark || null,
          });

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setCompletionDate("");
      setApplicationNumber("");
      setCableReturn(false);
      setCableReturnDate("");
      setPhotos([]);
      setPhotoPreviews([]);
      setRemark("");

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to submit";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const now = new Date();
  const currentDate = format(now, "dd MMM yyyy");
  const currentTime = format(now, "hh:mm a");

  return (
    <PullToRefresh onRefresh={loadUser}>
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
          <Send className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold">New Submission</h1>
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center gap-3 animate-slide-up">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          Submission recorded successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-danger border border-red-200 rounded-xl p-3 mb-6 text-sm flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-danger rounded-full flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-muted">
                Date (auto)
              </label>
              <div className="px-4 py-2.5 bg-gray-50 border border-border rounded-lg text-sm">
                {currentDate}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-muted">
                Time (auto)
              </label>
              <div className="px-4 py-2.5 bg-gray-50 border border-border rounded-lg text-sm">
                {currentTime}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-muted">
              Name (auto)
            </label>
            <div className="px-4 py-2.5 bg-gray-50 border border-border rounded-lg text-sm">
              {userName || "Loading..."}
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
              placeholder="Enter application number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Cable Return
            </label>
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
              <label className="block text-sm font-medium mb-1">
                Cable Return Date
              </label>
              <input
                type="date"
                value={cableReturnDate}
                onChange={(e) => setCableReturnDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Photo Submission (max 5)
            </label>
            <div className="flex flex-wrap gap-3">
              {photoPreviews.map((src, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img
                    src={src}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                  <ImagePlus className="w-5 h-5 text-muted" />
                  <span className="text-[10px] text-muted mt-1">Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    multiple
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Remark
            </label>
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
          disabled={loading}
          className="w-full gradient-bg text-white shadow-lg shadow-primary/25 py-3 rounded-xl font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
    </PullToRefresh>
  );
}

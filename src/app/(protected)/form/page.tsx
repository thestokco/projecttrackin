"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockStore } from "@/lib/mock-store";
import { format } from "date-fns";
import { Send, ImagePlus, X, CheckCircle, ScanLine } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";

export default function FormPage() {
  const isDemo = mockStore.isDemoMode();
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [applicationNumber, setApplicationNumber] = useState("");
  const [cableReturn, setCableReturn] = useState<"no" | "yes" | "na">("no");
  const [cableReturnDate, setCableReturnDate] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

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
    const MAX_BYTES = 15 * 1024 * 1024;
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
        rejected.push(`${f.name} (over 15MB)`);
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

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setError("");

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // Project No: extract number from "Project No./Cost Center : DJT/J1110198665" → 1110198665
      const projectMatch = text.match(/Project\s*No\.?\s*[/\\]?\s*Cost\s*Center\s*[:\s]+\S*?(\d{7,})/i)
        || text.match(/Cost\s*Center\s*[:\s]+\S*?(\d{7,})/i)
        || text.match(/Project\s*No\.?\s*[:\s]+\S*?(\d{7,})/i)
        || text.match(/DJT\S*?(\d{7,})/i)
        || text.match(/[A-Z]{2,4}[/\\][A-Z](\d{7,})/i);
      if (projectMatch) {
        setApplicationNumber(projectMatch[1]);
      }

      // Job Location: "Job Location : 11 LYNWOOD GROVE"
      const locationMatch = text.match(/Job\s*Location\s*[:\s]+(.+)/i)
        || text.match(/Location\s*[:\s]+(.+)/i);
      if (locationMatch) {
        const loc = locationMatch[1].replace(/^\s*[:]\s*/, "").trim().split("\n")[0].trim();
        setLocation(loc);
      }

      // Date: get from "Prepared By" section, not "Expiry Date"
      const preparedDateMatch = text.match(/Prepared\s*By[\s\S]*?Date\s*[:\s]+(\d{2}[./]\d{2}[./]\d{4})/i);
      const standaloneDateMatch = text.match(/(?<![Ee]xpiry\s)Date\s*[:\s]+(\d{2}[./]\d{2}[./]\d{4})/i);
      const anyDateMatch = text.match(/(\d{2}\.\d{2}\.\d{4})/);
      const dateMatch = preparedDateMatch || standaloneDateMatch || anyDateMatch;
      if (dateMatch) {
        const parts = dateMatch[1].split(/[./]/);
        if (parts.length === 3) {
          setCompletionDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }

      if (photos.length < 5) {
        setPhotos((prev) => [...prev, file]);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
    } catch {
      setError("Failed to scan document. Please try again.");
    } finally {
      setScanning(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const now = new Date();

      if (isDemo) {
        const cableReturnValue = cableReturn === "yes" ? true : cableReturn === "no" ? false : null;
        mockStore.addSubmission({
          user_id: userId,
          user_name: userName,
          submission_date: format(now, "yyyy-MM-dd"),
          submission_time: format(now, "HH:mm:ss"),
          completion_date: completionDate,
          application_number: applicationNumber,
          cable_return: cableReturnValue,
          cable_return_date: cableReturn === "yes" ? cableReturnDate || null : null,
          location: location || null,
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

        const cableReturnValue = cableReturn === "yes" ? true : cableReturn === "no" ? false : null;
        const { error: insertError } = await supabase
          .from("submissions")
          .insert({
            user_id: userId,
            user_name: userName,
            submission_date: format(now, "yyyy-MM-dd"),
            submission_time: format(now, "HH:mm:ss"),
            completion_date: completionDate,
            application_number: applicationNumber,
            cable_return: cableReturnValue,
            cable_return_date: cableReturn === "yes" ? cableReturnDate || null : null,
            location: location || null,
            photos: photoUrls,
            remark: remark || null,
          });

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setCompletionDate("");
      setApplicationNumber("");
      setCableReturn("no");
      setCableReturnDate("");
      setLocation("");
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
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center shadow-sm shadow-primary/20">
          <Send className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-lg font-bold">New Submission</h1>
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl p-3 mb-4 flex items-center gap-2 text-[13px] animate-slide-up">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Submission recorded successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-danger border border-red-100 rounded-xl p-2.5 mb-4 text-[13px] flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-danger rounded-full flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-card rounded-2xl border border-border/40 p-4 space-y-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium mb-1 text-muted uppercase tracking-wide">
                Date
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-border/60 rounded-lg text-[13px]">
                {currentDate}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1 text-muted uppercase tracking-wide">
                Time
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-border/60 rounded-lg text-[13px]">
                {currentTime}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium mb-1 text-muted uppercase tracking-wide">
              Name
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-border/60 rounded-lg text-[13px]">
              {userName || "Loading..."}
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
              placeholder="Enter application number"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
              placeholder="Enter location"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium mb-1.5">
              Cable Return
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCableReturn("no")}
                className={`flex-1 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
                  cableReturn === "no"
                    ? "bg-red-50 border-rose-300 text-rose-600"
                    : "border-border text-muted hover:border-gray-300"
                }`}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setCableReturn("yes")}
                className={`flex-1 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
                  cableReturn === "yes"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-600"
                    : "border-border text-muted hover:border-gray-300"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setCableReturn("na")}
                className={`flex-1 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
                  cableReturn === "na"
                    ? "bg-gray-100 border-gray-300 text-gray-600"
                    : "border-border text-muted hover:border-gray-300"
                }`}
              >
                N/A
              </button>
            </div>
          </div>

          {cableReturn === "yes" && (
            <div>
              <label className="block text-[13px] font-medium mb-1">
                Cable Return Date
              </label>
              <input
                type="date"
                value={cableReturnDate}
                onChange={(e) => setCableReturnDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-[13px] font-medium mb-1.5">
              Photos <span className="text-muted font-normal">(max 5 photos)</span>
            </label>

            <label className={`relative flex items-center justify-center gap-2 w-full py-2.5 mb-3 rounded-xl text-[13px] font-semibold border-2 border-dashed transition-colors cursor-pointer overflow-hidden ${scanning ? "border-blue-400 bg-blue-50 text-blue-600" : "border-border hover:border-primary/40 hover:bg-primary/5 text-muted hover:text-primary"}`}>
              {scanning && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200/50 to-transparent animate-scan-sweep" />}
              <ScanLine className={`w-4 h-4 ${scanning ? "animate-pulse" : ""}`} />
              {scanning ? "Scanning document..." : "Scan & Add Document"}
              <input
                type="file"
                accept="image/*"
                onChange={handleScan}
                disabled={scanning}
                className="hidden"
              />
            </label>



            <div className="flex flex-wrap gap-2">
              {photoPreviews.map((src, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
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
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                  <ImagePlus className="w-4 h-4 text-muted" />
                  <span className="text-[9px] text-muted mt-0.5">Add</span>
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
            <label className="block text-[13px] font-medium mb-1">
              Remark
            </label>
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
          disabled={loading}
          className="w-full gradient-bg text-white shadow-md shadow-primary/20 py-2.5 rounded-xl text-[13px] font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Send className="w-3.5 h-3.5" />
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
    </PullToRefresh>
  );
}

"use client";

import { useEffect, useState } from "react";
import { X, Share, Plus } from "lucide-react";

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as { standalone?: boolean }).standalone === true);

    if (isStandalone) return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const alreadyAdded = localStorage.getItem("added-to-homescreen");
    if (alreadyAdded) return;

    setTimeout(() => setShowPrompt(true), 2000);
  }, []);

  function handleDone() {
    setShowPrompt(false);
    localStorage.setItem("added-to-homescreen", "true");
  }

  function handleLater() {
    setShowPrompt(false);
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-[60] max-w-md mx-auto animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-border p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">
              Add to Home Screen
            </h3>
            <p className="text-xs text-muted mt-1">
              Get quick access to Project Tracker like a real app.
            </p>

            <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-foreground">
                <span className="bg-primary/10 text-primary font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <span className="flex items-center gap-1">
                  Tap the <Share className="w-4 h-4 text-primary inline" /> <strong>Share</strong> button below
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground">
                <span className="bg-primary/10 text-primary font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <span className="flex items-center gap-1">
                  Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground">
                <span className="bg-primary/10 text-primary font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                  3
                </span>
                <span>
                  Tap <strong>&quot;Add&quot;</strong> to confirm
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleDone}
                className="flex-1 bg-primary text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-primary-hover transition-colors"
              >
                Done, I&apos;ve added it
              </button>
              <button
                onClick={handleLater}
                className="text-sm text-muted hover:text-foreground py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleLater}
            className="text-muted hover:text-foreground p-1 -mt-1 -mr-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

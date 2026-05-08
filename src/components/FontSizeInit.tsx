"use client";

import { useEffect } from "react";
import { applyFontSize } from "@/lib/font-size";

export default function FontSizeInit() {
  useEffect(() => {
    applyFontSize();
  }, []);
  return null;
}

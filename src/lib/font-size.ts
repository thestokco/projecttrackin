const STORAGE_KEY = "app-font-size";

export type FontSize = "small" | "medium" | "large" | "xlarge";

export const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "Extra Large" },
];

export function getFontSize(): FontSize {
  if (typeof window === "undefined") return "medium";
  return (localStorage.getItem(STORAGE_KEY) as FontSize) || "medium";
}

export function setFontSize(size: FontSize) {
  localStorage.setItem(STORAGE_KEY, size);
  applyFontSize(size);
}

const ZOOM_MAP: Record<FontSize, number> = {
  small: 0.88,
  medium: 1,
  large: 1.14,
  xlarge: 1.28,
};

export function applyFontSize(size?: FontSize) {
  const s = size || getFontSize();
  document.body.classList.remove("font-small", "font-medium", "font-large", "font-xlarge");
  document.body.classList.add(`font-${s}`);
  (document.body.style as unknown as Record<string, string>).zoom = String(ZOOM_MAP[s]);
}

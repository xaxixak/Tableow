/**
 * Vibrant per-category colors used across GridNode, BaseNode, and NodePalette.
 * Colors are assigned by colorIndex (set during auto-numbering) so each C(x) gets a unique color.
 */

export interface CategoryColor {
  /** Hex color for left border accent / icon badge */
  hex: string;
  /** Lighter hex for background tint (light mode) */
  bgHex: string;
  /** Dark mode background tint */
  darkBgHex: string;
  /** Lighter hex for palette category header (light mode) */
  headerBgHex: string;
  /** Dark mode palette header */
  headerDarkBgHex: string;
  /** Hover hex for palette header (light mode) */
  headerHoverHex: string;
  /** Tailwind class for icon badge / canvas node header background */
  headerClass: string;
}

export const COLOR_PALETTE: CategoryColor[] = [
  { // 0 - cyan
    hex: "#06b6d4", bgHex: "#ecfeff", darkBgHex: "#0e3a3e",
    headerBgHex: "#cffafe", headerDarkBgHex: "#164e63", headerHoverHex: "#a5f3fc",
    headerClass: "bg-cyan-600",
  },
  { // 1 - violet
    hex: "#8b5cf6", bgHex: "#f5f3ff", darkBgHex: "#2e1a5e",
    headerBgHex: "#ede9fe", headerDarkBgHex: "#4c1d95", headerHoverHex: "#ddd6fe",
    headerClass: "bg-violet-600",
  },
  { // 2 - pink
    hex: "#ec4899", bgHex: "#fdf2f8", darkBgHex: "#4a1a3a",
    headerBgHex: "#fce7f3", headerDarkBgHex: "#831843", headerHoverHex: "#fbcfe8",
    headerClass: "bg-pink-600",
  },
  { // 3 - amber
    hex: "#f59e0b", bgHex: "#fffbeb", darkBgHex: "#3d2e0a",
    headerBgHex: "#fef3c7", headerDarkBgHex: "#78350f", headerHoverHex: "#fde68a",
    headerClass: "bg-amber-600",
  },
  { // 4 - emerald
    hex: "#10b981", bgHex: "#ecfdf5", darkBgHex: "#0d3a2a",
    headerBgHex: "#d1fae5", headerDarkBgHex: "#064e3b", headerHoverHex: "#a7f3d0",
    headerClass: "bg-emerald-600",
  },
  { // 5 - rose
    hex: "#f43f5e", bgHex: "#fff1f2", darkBgHex: "#4a1a24",
    headerBgHex: "#ffe4e6", headerDarkBgHex: "#881337", headerHoverHex: "#fecdd3",
    headerClass: "bg-rose-600",
  },
  { // 6 - blue
    hex: "#3b82f6", bgHex: "#eff6ff", darkBgHex: "#1a2a4a",
    headerBgHex: "#dbeafe", headerDarkBgHex: "#1e3a5f", headerHoverHex: "#bfdbfe",
    headerClass: "bg-blue-600",
  },
  { // 7 - teal
    hex: "#14b8a6", bgHex: "#f0fdfa", darkBgHex: "#0d3d38",
    headerBgHex: "#ccfbf1", headerDarkBgHex: "#134e4a", headerHoverHex: "#99f6e4",
    headerClass: "bg-teal-600",
  },
  { // 8 - orange
    hex: "#f97316", bgHex: "#fff7ed", darkBgHex: "#431407",
    headerBgHex: "#ffedd5", headerDarkBgHex: "#7c2d12", headerHoverHex: "#fed7aa",
    headerClass: "bg-orange-600",
  },
  { // 9 - indigo
    hex: "#6366f1", bgHex: "#eef2ff", darkBgHex: "#1e1b4b",
    headerBgHex: "#e0e7ff", headerDarkBgHex: "#312e81", headerHoverHex: "#c7d2fe",
    headerClass: "bg-indigo-600",
  },
];

/** Default gray color for categories without a colorIndex */
const DEFAULT_COLOR: CategoryColor = {
  hex: "#64748b", bgHex: "#f8fafc", darkBgHex: "#1e1e2e",
  headerBgHex: "#f1f5f9", headerDarkBgHex: "#334155", headerHoverHex: "#e2e8f0",
  headerClass: "bg-slate-600",
};

/**
 * Get color by palette index (assigned during auto-numbering).
 * Wraps around if more categories than colors.
 */
export function getColorByIndex(index: number | undefined): CategoryColor {
  if (index === undefined) return DEFAULT_COLOR;
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

// The grading systems the app knows about.
//
// Each one is a small description the engine reads: where the scale starts and
// ends, which way is "good", where the pass line sits, and how to round. The
// presets cover the systems most students meet; the Custom builder covers
// everything else, so the tool is honestly usable anywhere.

import type { Rounding, Direction } from "./grades";

export type InputKind = "numeric" | "scale";

export interface ScaleOption {
  label: string;
  value: number;
}

export interface GradingSystem {
  id: string;
  country: string;
  flag: string;
  name: string;
  short: string; // compact label for the pill, e.g. "1–6"
  kind: InputKind;
  min: number;
  max: number;
  direction: Direction;
  pass: number;
  decimals: number;
  rounding: Rounding;
  step: number; // input step for numeric entry
  options?: ScaleOption[];
  passLabel: string;
  failLabel: string;
  note?: string;
}

// Letter scales --------------------------------------------------------------

const US_GPA: ScaleOption[] = [
  { label: "A+", value: 4.0 },
  { label: "A", value: 4.0 },
  { label: "A−", value: 3.7 },
  { label: "B+", value: 3.3 },
  { label: "B", value: 3.0 },
  { label: "B−", value: 2.7 },
  { label: "C+", value: 2.3 },
  { label: "C", value: 2.0 },
  { label: "C−", value: 1.7 },
  { label: "D+", value: 1.3 },
  { label: "D", value: 1.0 },
  { label: "D−", value: 0.7 },
  { label: "F", value: 0.0 },
];

const DK_7: ScaleOption[] = [
  { label: "12", value: 12 },
  { label: "10", value: 10 },
  { label: "7", value: 7 },
  { label: "4", value: 4 },
  { label: "02", value: 2 },
  { label: "00", value: 0 },
  { label: "-3", value: -3 },
];

// Presets --------------------------------------------------------------------

export const SYSTEMS: GradingSystem[] = [
  { id: "ch", country: "Switzerland", flag: "🇨🇭", name: "Swiss 1–6", short: "1–6", kind: "numeric", min: 1, max: 6, direction: "up", pass: 4, decimals: 2, rounding: "half", step: 0.25, passLabel: "genügend", failLabel: "ungenügend", note: "6 best · 4 passes · Zeugnis usually rounds to halves" },
  { id: "de-school", country: "Germany", flag: "🇩🇪", name: "German school 1–6", short: "1–6", kind: "numeric", min: 1, max: 6, direction: "down", pass: 4, decimals: 1, rounding: "tenth", step: 1, passLabel: "bestanden", failLabel: "durchgefallen", note: "1 best · 4 still passes · 5–6 fail" },
  { id: "de-uni", country: "Germany", flag: "🇩🇪", name: "German university 1.0–5.0", short: "1.0–5.0", kind: "numeric", min: 1, max: 5, direction: "down", pass: 4, decimals: 1, rounding: "tenth", step: 0.1, passLabel: "bestanden", failLabel: "nicht bestanden", note: "1.0 best · 4.0 passes · 5.0 fails" },
  { id: "at", country: "Austria", flag: "🇦🇹", name: "Austrian 1–5", short: "1–5", kind: "numeric", min: 1, max: 5, direction: "down", pass: 4, decimals: 2, rounding: "tenth", step: 1, passLabel: "positiv", failLabel: "nicht genügend", note: "1 best · 5 fails" },
  { id: "fr", country: "France", flag: "🇫🇷", name: "French 0–20", short: "0–20", kind: "numeric", min: 0, max: 20, direction: "up", pass: 10, decimals: 2, rounding: "tenth", step: 0.5, passLabel: "suffisant", failLabel: "insuffisant", note: "20 best · 10 passes" },
  { id: "us-gpa", country: "United States", flag: "🇺🇸", name: "US GPA (4.0)", short: "GPA 4.0", kind: "scale", min: 0, max: 4, direction: "up", pass: 2, decimals: 2, rounding: "hundredth", step: 0.01, options: US_GPA, passLabel: "good standing", failLabel: "below 2.0", note: "Letter grades averaged into a 4.0 GPA" },
  { id: "us-pct", country: "United States", flag: "🇺🇸", name: "US percentage", short: "0–100%", kind: "numeric", min: 0, max: 100, direction: "up", pass: 60, decimals: 1, rounding: "tenth", step: 1, passLabel: "pass", failLabel: "fail", note: "100 best · 60% passes (varies by school)" },
  { id: "uk", country: "United Kingdom", flag: "🇬🇧", name: "UK percentage", short: "0–100%", kind: "numeric", min: 0, max: 100, direction: "up", pass: 40, decimals: 1, rounding: "tenth", step: 1, passLabel: "pass", failLabel: "fail", note: "40% passes · 70%+ is a First" },
  { id: "nl", country: "Netherlands", flag: "🇳🇱", name: "Dutch 1–10", short: "1–10", kind: "numeric", min: 1, max: 10, direction: "up", pass: 5.5, decimals: 1, rounding: "tenth", step: 0.1, passLabel: "voldoende", failLabel: "onvoldoende", note: "10 best · 5.5 passes" },
  { id: "it-school", country: "Italy", flag: "🇮🇹", name: "Italian school 0–10", short: "0–10", kind: "numeric", min: 0, max: 10, direction: "up", pass: 6, decimals: 1, rounding: "tenth", step: 0.5, passLabel: "sufficiente", failLabel: "insufficiente", note: "10 best · 6 passes" },
  { id: "it-uni", country: "Italy", flag: "🇮🇹", name: "Italian university 18–30", short: "18–30", kind: "numeric", min: 18, max: 30, direction: "up", pass: 18, decimals: 1, rounding: "whole", step: 1, passLabel: "superato", failLabel: "—", note: "30 best · 18 passes (lode not modelled)" },
  { id: "es", country: "Spain", flag: "🇪🇸", name: "Spanish 0–10", short: "0–10", kind: "numeric", min: 0, max: 10, direction: "up", pass: 5, decimals: 1, rounding: "tenth", step: 0.5, passLabel: "aprobado", failLabel: "suspenso", note: "10 best · 5 passes" },
  { id: "pl", country: "Poland", flag: "🇵🇱", name: "Polish 2–6", short: "2–6", kind: "numeric", min: 2, max: 6, direction: "up", pass: 3, decimals: 1, rounding: "half", step: 0.5, passLabel: "zaliczone", failLabel: "niezaliczone", note: "6 best · 2 fails · 3 passes" },
  { id: "ru", country: "Russia", flag: "🇷🇺", name: "Russian 1–5", short: "1–5", kind: "numeric", min: 1, max: 5, direction: "up", pass: 3, decimals: 2, rounding: "tenth", step: 1, passLabel: "зачёт", failLabel: "незачёт", note: "5 best · 3 passes" },
  { id: "dk", country: "Denmark", flag: "🇩🇰", name: "Danish 7-trin", short: "7-step", kind: "scale", min: -3, max: 12, direction: "up", pass: 2, decimals: 1, rounding: "tenth", step: 1, options: DK_7, passLabel: "bestået", failLabel: "ikke bestået", note: "12 best · 02 passes · −3 lowest" },
  { id: "in", country: "India", flag: "🇮🇳", name: "Indian CGPA (10)", short: "CGPA 10", kind: "numeric", min: 0, max: 10, direction: "up", pass: 4, decimals: 2, rounding: "hundredth", step: 0.1, passLabel: "pass", failLabel: "fail", note: "10 best · pass varies (≈4–5)" },
  { id: "cn", country: "China", flag: "🇨🇳", name: "Chinese percentage", short: "0–100", kind: "numeric", min: 0, max: 100, direction: "up", pass: 60, decimals: 1, rounding: "tenth", step: 1, passLabel: "及格", failLabel: "不及格", note: "100 best · 60 passes" },
  { id: "jp", country: "Japan", flag: "🇯🇵", name: "Japanese percentage", short: "0–100", kind: "numeric", min: 0, max: 100, direction: "up", pass: 60, decimals: 1, rounding: "tenth", step: 1, passLabel: "合格", failLabel: "不合格", note: "100 best · 60 passes" },
  { id: "br", country: "Brazil", flag: "🇧🇷", name: "Brazilian 0–10", short: "0–10", kind: "numeric", min: 0, max: 10, direction: "up", pass: 6, decimals: 1, rounding: "tenth", step: 0.5, passLabel: "aprovado", failLabel: "reprovado", note: "10 best · 6 passes (varies)" },
  { id: "ca-gpa", country: "Canada", flag: "🇨🇦", name: "Canadian GPA (4.0)", short: "GPA 4.0", kind: "scale", min: 0, max: 4, direction: "up", pass: 2, decimals: 2, rounding: "hundredth", step: 0.01, options: US_GPA, passLabel: "good standing", failLabel: "below 2.0", note: "Letter grades averaged into a 4.0 GPA" },
];

export const CUSTOM_ID = "custom";

export function makeCustom(p: Partial<GradingSystem>): GradingSystem {
  const min = p.min ?? 0;
  const max = p.max ?? 100;
  const direction = p.direction ?? "up";
  return {
    id: CUSTOM_ID,
    country: "Custom",
    flag: "⚙︎",
    name: p.name?.trim() || "Custom scale",
    short: `${min}–${max}`,
    kind: "numeric",
    min,
    max,
    direction,
    pass: p.pass ?? (direction === "up" ? min + (max - min) / 2 : max - (max - min) / 2),
    decimals: p.decimals ?? 2,
    rounding: p.rounding ?? "tenth",
    step: p.step ?? 1,
    passLabel: "pass",
    failLabel: "below pass",
  };
}

export function systemById(id: string): GradingSystem | undefined {
  return SYSTEMS.find((s) => s.id === id);
}

// A grade value that is a "good" example for this system, at the given fraction
// from worst (0) to best (1) — used to seed friendly demo data.
export function exampleValue(sys: GradingSystem, frac: number): number {
  if (sys.kind === "scale" && sys.options && sys.options.length) {
    const sorted = [...sys.options].sort((a, b) =>
      sys.direction === "up" ? a.value - b.value : b.value - a.value
    );
    const idx = Math.round(frac * (sorted.length - 1));
    return sorted[idx].value;
  }
  const v = sys.direction === "up" ? sys.min + (sys.max - sys.min) * frac : sys.max - (sys.max - sys.min) * frac;
  return Math.round(v / sys.step) * sys.step;
}

export function labelForValue(sys: GradingSystem, value: number): string | undefined {
  if (sys.kind !== "scale" || !sys.options) return undefined;
  const hit = sys.options.find((o) => o.value === value);
  return hit?.label;
}

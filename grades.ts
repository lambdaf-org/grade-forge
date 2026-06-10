// rechenschaft — the engine.
//
// Every public function returns a `Reckoning`: not just a number, but the
// ordered list of steps that produced it, with the actual values substituted
// in. The UI renders that list verbatim. Nothing is computed off-screen.
//
// Swiss scale: 1.0 (lowest) … 6.0 (highest). 4.0 is the pass line.
// Rounding is "round half up" (kaufmännisch): a value sitting exactly on the
// boundary goes to the larger grade. Which unit you round to (halves, tenths,
// whole, or none) is a school/Reglement decision, so it is a setting, never
// baked in.

export const PASS = 4;

export type Rounding = "none" | "tenth" | "half" | "whole";

export interface GradeItem {
  value: number;
  weight: number;
  label?: string;
}

export interface Step {
  label: string; // what this line does, in plain words
  expr: string; // the formula with the real numbers in it
  result: number; // what that formula evaluates to
}

export interface Reckoning {
  value: number; // final grade after rounding (NaN when there is nothing to compute)
  raw: number | null; // exact value before rounding
  steps: Step[]; // the receipt, in order
  ok: boolean | null; // value >= PASS, or null when there is no value
}

// ---- number helpers ---------------------------------------------------------

// Strip binary-float dust (e.g. 4.15 * 10 = 41.4999999996) before rounding.
function clean(x: number): number {
  return Math.round(x * 1e9) / 1e9;
}

// Round half up, for positive grades.
function roundHalfUp(x: number): number {
  return Math.floor(clean(x) + 0.5);
}

// Format a number for display: trim trailing zeros, keep it honest.
export function fmt(x: number, dp = 4): string {
  if (!isFinite(x)) return "—";
  let s = clean(x).toFixed(dp);
  if (s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s;
}

// ---- rounding ---------------------------------------------------------------

export function applyRounding(
  x: number,
  mode: Rounding
): { value: number; step: Step | null } {
  switch (mode) {
    case "none":
      return { value: clean(x), step: null };
    case "tenth": {
      const v = roundHalfUp(x * 10) / 10;
      return {
        value: v,
        step: { label: "Round to nearest 0.1", expr: `round(${fmt(x)} × 10) ÷ 10`, result: v },
      };
    }
    case "half": {
      const v = roundHalfUp(x * 2) / 2;
      return {
        value: v,
        step: { label: "Round to nearest 0.5", expr: `round(${fmt(x)} × 2) ÷ 2`, result: v },
      };
    }
    case "whole": {
      const v = roundHalfUp(x);
      return {
        value: v,
        step: { label: "Round to nearest 1", expr: `round(${fmt(x)})`, result: v },
      };
    }
  }
}

// ---- weighted average -------------------------------------------------------

export function average(items: GradeItem[], mode: Rounding): Reckoning {
  const valid = items.filter(
    (i) => isFinite(i.value) && isFinite(i.weight) && i.weight > 0
  );
  if (valid.length === 0) return { value: NaN, raw: null, steps: [], ok: null };

  const num = valid.reduce((s, i) => s + i.value * i.weight, 0);
  const den = valid.reduce((s, i) => s + i.weight, 0);
  const raw = num / den;
  const allUnit = valid.every((i) => i.weight === 1);
  const steps: Step[] = [];

  if (allUnit) {
    if (valid.length > 1) {
      steps.push({
        label: "Add the grades",
        expr: valid.map((i) => fmt(i.value)).join(" + "),
        result: num,
      });
      steps.push({
        label: `Divide by ${valid.length}`,
        expr: `${fmt(num)} ÷ ${valid.length}`,
        result: raw,
      });
    } else {
      steps.push({ label: "Single grade", expr: fmt(valid[0].value), result: raw });
    }
  } else {
    steps.push({
      label: "Weight each grade",
      expr: valid.map((i) => `${fmt(i.value)}×${fmt(i.weight)}`).join(" + "),
      result: num,
    });
    steps.push({
      label: "Add the weights",
      expr: valid.map((i) => fmt(i.weight)).join(" + "),
      result: den,
    });
    steps.push({ label: "Divide", expr: `${fmt(num)} ÷ ${fmt(den)}`, result: raw });
  }

  const r = applyRounding(raw, mode);
  if (r.step) steps.push(r.step);
  return { value: r.value, raw, steps, ok: r.value >= PASS };
}

// ---- points → grade ---------------------------------------------------------

// Proportional line through (0 pts → 1.0) and (max pts → 6.0).
export function pointsProportional(
  points: number,
  max: number,
  mode: Rounding
): Reckoning {
  if (!(max > 0) || !isFinite(points))
    return { value: NaN, raw: null, steps: [], ok: null };
  const ratio = points / max;
  const scaled = 1 + 5 * ratio;
  const raw = Math.min(6, Math.max(1, scaled));
  const steps: Step[] = [
    { label: "Share of the points", expr: `${fmt(points)} ÷ ${fmt(max)}`, result: ratio },
    { label: "Place on the 1–6 scale", expr: `1 + 5 × ${fmt(ratio)}`, result: scaled },
  ];
  if (raw !== scaled)
    steps.push({ label: "Clamp to 1–6", expr: `min(6, max(1, ${fmt(scaled)}))`, result: raw });
  const r = applyRounding(raw, mode);
  if (r.step) steps.push(r.step);
  return { value: r.value, raw, steps, ok: r.value >= PASS };
}

// Two-segment line where the pass mark (grade 4.0) sits at `passPct` percent:
//   0 … passPct%   maps to 1.0 … 4.0
//   passPct … 100% maps to 4.0 … 6.0
export function pointsLinear(
  points: number,
  max: number,
  passPct: number,
  mode: Rounding
): Reckoning {
  if (!(max > 0) || !isFinite(points) || !(passPct > 0 && passPct < 100))
    return { value: NaN, raw: null, steps: [], ok: null };
  const pct = (points / max) * 100;
  const steps: Step[] = [
    { label: "Percentage reached", expr: `${fmt(points)} ÷ ${fmt(max)} × 100`, result: pct },
  ];
  let scaled: number;
  if (pct <= passPct) {
    scaled = 1 + 3 * (pct / passPct);
    steps.push({
      label: `Below the line (0–${fmt(passPct)}% → 1.0–4.0)`,
      expr: `1 + 3 × (${fmt(pct)} ÷ ${fmt(passPct)})`,
      result: scaled,
    });
  } else {
    scaled = 4 + 2 * ((pct - passPct) / (100 - passPct));
    steps.push({
      label: `Above the line (${fmt(passPct)}–100% → 4.0–6.0)`,
      expr: `4 + 2 × ((${fmt(pct)} − ${fmt(passPct)}) ÷ (100 − ${fmt(passPct)}))`,
      result: scaled,
    });
  }
  const raw = Math.min(6, Math.max(1, scaled));
  if (raw !== scaled)
    steps.push({ label: "Clamp to 1–6", expr: `min(6, max(1, ${fmt(scaled)}))`, result: raw });
  const r = applyRounding(raw, mode);
  if (r.step) steps.push(r.step);
  return { value: r.value, raw, steps, ok: r.value >= PASS };
}

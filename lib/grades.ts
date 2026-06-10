// rechenschaft — the engine.
//
// Every public function returns a `Reckoning`: not just a number, but the
// ordered steps that produced it, with the real values substituted in. The UI
// renders that list verbatim. Nothing is computed off-screen.
//
// The engine knows nothing about any one country. A `GradingSystem` (see
// lib/systems.ts) supplies the bounds, the pass mark, and the direction
// (whether a higher number is better, as in Switzerland, or lower, as in
// Germany). Rounding is "round half up"; which unit you round to is a setting.

export type Rounding = "none" | "hundredth" | "tenth" | "half" | "whole";
export type Direction = "up" | "down"; // "up" = a higher number is the better grade

export interface GradeItem {
  value: number;
  weight: number;
  display?: string; // optional label shown in the receipt instead of the bare number (e.g. a letter grade)
}

export interface Bounds {
  min: number;
  max: number;
  direction: Direction;
  pass: number;
}

export interface Step {
  label: string;
  expr: string;
  result: number;
}

export interface Reckoning {
  value: number; // final grade after rounding (NaN when there is nothing to compute)
  raw: number | null; // exact value before rounding
  steps: Step[]; // the receipt, in order
  ok: boolean | null; // passes the pass mark, or null when there is no value / no system
}

// ---- number helpers ---------------------------------------------------------

function clean(x: number): number {
  return Math.round(x * 1e9) / 1e9; // strip binary-float dust before rounding
}

function roundHalfUp(x: number): number {
  return Math.floor(clean(x) + 0.5);
}

export function fmt(x: number, dp = 4): string {
  if (!isFinite(x)) return "—";
  let s = clean(x).toFixed(dp);
  if (s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s;
}

export function passes(value: number, b: Bounds): boolean {
  if (!isFinite(value)) return false;
  return b.direction === "up" ? value >= b.pass : value <= b.pass;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

// ---- rounding ---------------------------------------------------------------

export function applyRounding(
  x: number,
  mode: Rounding
): { value: number; step: Step | null } {
  switch (mode) {
    case "none":
      return { value: clean(x), step: null };
    case "hundredth": {
      const v = roundHalfUp(x * 100) / 100;
      return { value: v, step: { label: "Round to nearest 0.01", expr: `round(${fmt(x)} × 100) ÷ 100`, result: v } };
    }
    case "tenth": {
      const v = roundHalfUp(x * 10) / 10;
      return { value: v, step: { label: "Round to nearest 0.1", expr: `round(${fmt(x)} × 10) ÷ 10`, result: v } };
    }
    case "half": {
      const v = roundHalfUp(x * 2) / 2;
      return { value: v, step: { label: "Round to nearest 0.5", expr: `round(${fmt(x)} × 2) ÷ 2`, result: v } };
    }
    case "whole": {
      const v = roundHalfUp(x);
      return { value: v, step: { label: "Round to nearest 1", expr: `round(${fmt(x)})`, result: v } };
    }
  }
}

// ---- weighted average -------------------------------------------------------

const term = (i: GradeItem) => (i.display ? `${fmt(i.value)}(${i.display})` : fmt(i.value));

export function average(items: GradeItem[], mode: Rounding, b?: Bounds): Reckoning {
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
      steps.push({ label: "Add the grades", expr: valid.map(term).join(" + "), result: num });
      steps.push({ label: `Divide by ${valid.length}`, expr: `${fmt(num)} ÷ ${valid.length}`, result: raw });
    } else {
      steps.push({ label: "Single grade", expr: term(valid[0]), result: raw });
    }
  } else {
    steps.push({
      label: "Weight each grade",
      expr: valid.map((i) => `${term(i)}×${fmt(i.weight)}`).join(" + "),
      result: num,
    });
    steps.push({ label: "Add the weights", expr: valid.map((i) => fmt(i.weight)).join(" + "), result: den });
    steps.push({ label: "Divide", expr: `${fmt(num)} ÷ ${fmt(den)}`, result: raw });
  }

  const r = applyRounding(raw, mode);
  if (r.step) steps.push(r.step);
  return { value: r.value, raw, steps, ok: b ? passes(r.value, b) : null };
}

// ---- points → grade ---------------------------------------------------------

// A straight line from worst grade at 0 points to best grade at full marks,
// respecting the system's direction.
export function pointsProportional(points: number, max: number, mode: Rounding, b: Bounds): Reckoning {
  if (!(max > 0) || !isFinite(points)) return { value: NaN, raw: null, steps: [], ok: null };
  const span = b.max - b.min;
  const ratio = points / max;
  const scaled = b.direction === "up" ? b.min + span * ratio : b.max - span * ratio;
  const raw = clamp(scaled, b.min, b.max);
  const placement =
    b.direction === "up"
      ? `${fmt(b.min)} + ${fmt(span)} × ${fmt(ratio)}`
      : `${fmt(b.max)} − ${fmt(span)} × ${fmt(ratio)}`;
  const steps: Step[] = [
    { label: "Share of the points", expr: `${fmt(points)} ÷ ${fmt(max)}`, result: ratio },
    { label: `Place on the ${fmt(b.min)}–${fmt(b.max)} scale`, expr: placement, result: scaled },
  ];
  if (raw !== scaled)
    steps.push({ label: "Clamp to scale", expr: `min(${fmt(b.max)}, max(${fmt(b.min)}, ${fmt(scaled)}))`, result: raw });
  const r = applyRounding(raw, mode);
  if (r.step) steps.push(r.step);
  return { value: r.value, raw, steps, ok: passes(r.value, b) };
}

// A two-segment line where the pass mark sits at `passPct` percent of the points,
// respecting the system's direction.
export function pointsLinear(points: number, max: number, passPct: number, mode: Rounding, b: Bounds): Reckoning {
  if (!(max > 0) || !isFinite(points) || !(passPct > 0 && passPct < 100))
    return { value: NaN, raw: null, steps: [], ok: null };
  const pct = (points / max) * 100;
  const worst = b.direction === "up" ? b.min : b.max;
  const best = b.direction === "up" ? b.max : b.min;
  const steps: Step[] = [{ label: "Percentage reached", expr: `${fmt(points)} ÷ ${fmt(max)} × 100`, result: pct }];
  let scaled: number;
  if (pct <= passPct) {
    scaled = worst + (b.pass - worst) * (pct / passPct);
    steps.push({
      label: `Below the line (0–${fmt(passPct)}% → ${fmt(worst)}–${fmt(b.pass)})`,
      expr: `${fmt(worst)} + (${fmt(b.pass)} − ${fmt(worst)}) × (${fmt(pct)} ÷ ${fmt(passPct)})`,
      result: scaled,
    });
  } else {
    scaled = b.pass + (best - b.pass) * ((pct - passPct) / (100 - passPct));
    steps.push({
      label: `Above the line (${fmt(passPct)}–100% → ${fmt(b.pass)}–${fmt(best)})`,
      expr: `${fmt(b.pass)} + (${fmt(best)} − ${fmt(b.pass)}) × ((${fmt(pct)} − ${fmt(passPct)}) ÷ (100 − ${fmt(passPct)}))`,
      result: scaled,
    });
  }
  const raw = clamp(scaled, b.min, b.max);
  if (raw !== scaled)
    steps.push({ label: "Clamp to scale", expr: `min(${fmt(b.max)}, max(${fmt(b.min)}, ${fmt(scaled)}))`, result: raw });
  const r = applyRounding(raw, mode);
  if (r.step) steps.push(r.step);
  return { value: r.value, raw, steps, ok: passes(r.value, b) };
}

"use client";

// Small presentational pieces. Everything in this file renders props — no
// state, no storage, no math.

import { fmt, type Reckoning } from "@/lib/grades";
import type { GradingSystem } from "@/lib/systems";
import type { Grade } from "@/lib/model";

export function field(extra = "") {
  return "rounded-md border bg-transparent px-2 py-1 text-sm outline-none transition-colors focus:border-[var(--forge)] " + extra;
}

export function gradeColor(value: number, ok: boolean | null) {
  if (ok === null || !isFinite(value)) return "var(--muted)";
  return ok ? "var(--ink)" : "var(--no)";
}

export function Verdict({ r, sys }: { r: Reckoning; sys: GradingSystem }) {
  if (r.ok === null) return null;
  return (
    <span
      className="tnum inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.72rem] font-medium"
      style={{
        color: r.ok ? "var(--ok)" : "var(--no)",
        background: r.ok ? "rgba(47,125,87,0.10)" : "var(--forge-soft)",
      }}
    >
      <span aria-hidden>{r.ok ? "✓" : "✕"}</span>
      {r.ok ? sys.passLabel : sys.failLabel}
    </span>
  );
}

// The big number plus its pass/fail pill.
export function ResultFigure({ r, sys, dp, size = "text-5xl" }: { r: Reckoning; sys: GradingSystem; dp: number; size?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`tnum font-display ${size} font-bold leading-none`} style={{ color: gradeColor(r.value, r.ok) }}>
        {isFinite(r.value) ? fmt(r.value, dp) : "—"}
      </span>
      <Verdict r={r} sys={sys} />
    </div>
  );
}

export function Receipt({ r, show, dp }: { r: Reckoning; show: boolean; dp: number }) {
  if (!show || r.steps.length === 0) return null;
  return (
    <div className="mt-3 overflow-x-auto pl-3 text-[0.82rem]" style={{ borderLeft: "2px solid var(--forge)" }}>
      <table className="font-mono w-full border-collapse">
        <tbody>
          {r.steps.map((s, i) => (
            <tr key={i} className="align-baseline">
              <td className="py-0.5 pr-4 whitespace-nowrap" style={{ color: "var(--muted)" }}>{s.label}</td>
              <td className="tnum py-0.5 pr-3 whitespace-nowrap">{s.expr}</td>
              <td className="tnum py-0.5 whitespace-nowrap" style={{ color: "var(--muted)" }}>
                = {fmt(s.result, i === r.steps.length - 1 ? dp : 4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {r.raw !== null && r.value !== r.raw && (
        <p className="tnum font-mono mt-1 text-[0.78rem]" style={{ color: "var(--muted)" }}>
          exact {fmt(r.raw)} → {fmt(r.value, dp)}
        </p>
      )}
    </div>
  );
}

export function GradeValue({ sys, value, onChange }: { sys: GradingSystem; value: string; onChange: (v: string) => void }) {
  if (sys.kind === "scale") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Grade"
        className={"tnum w-20 " + field()}
        style={{ borderColor: "var(--line)" }}
      >
        <option value="">—</option>
        {sys.options!.map((o) => (
          <option key={o.label} value={o.label}>{o.label}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="grade"
      inputMode="decimal"
      aria-label="Grade"
      className={"tnum w-16 text-center " + field()}
      style={{ borderColor: "var(--line)" }}
    />
  );
}

// One editable grade line: label · value · weight · remove.
export function GradeRow({ sys, grade, onEdit, onRemove }: {
  sys: GradingSystem;
  grade: Grade;
  onEdit: (p: Partial<Grade>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input value={grade.label} onChange={(e) => onEdit({ label: e.target.value })} placeholder="Exam" aria-label="Grade label" className={"min-w-0 flex-1 " + field()} style={{ borderColor: "var(--line)" }} />
      <GradeValue sys={sys} value={grade.value} onChange={(v) => onEdit({ value: v })} />
      <span className="text-xs" style={{ color: "var(--muted)" }}>×</span>
      <input value={grade.weight} onChange={(e) => onEdit({ weight: e.target.value })} placeholder="1" inputMode="decimal" aria-label="Grade weight" className={"tnum w-12 text-center " + field()} style={{ borderColor: "var(--line)" }} />
      <button onClick={onRemove} aria-label="Remove grade" className="px-1 text-base leading-none" style={{ color: "var(--muted)", opacity: 1 }}>×</button>
    </div>
  );
}

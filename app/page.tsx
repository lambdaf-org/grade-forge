/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  average,
  pointsProportional,
  pointsLinear,
  fmt,
  type Rounding,
  type Reckoning,
  type GradeItem,
  type Bounds,
} from "@/lib/grades";
import {
  SYSTEMS,
  systemById,
  makeCustom,
  exampleValue,
  labelForValue,
  type GradingSystem,
} from "@/lib/systems";

type Grade = { id: string; label: string; value: string; weight: string };
type Subject = { id: string; name: string; weight: string; grades: Grade[] };

type State = {
  systemId: string;
  custom: GradingSystem | null;
  chosen: boolean;
  view: "subjects" | "quick";
  rounding: Rounding;
  showWork: boolean;
  subjects: Subject[];
  quick: Grade[];
  conv: { variant: "proportional" | "linear"; points: string; max: string; passPct: string };
};

const STORAGE_KEY = "rechenschaft-v2";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const roundingLabels: { id: Rounding; label: string; hint: string }[] = [
  { id: "hundredth", label: "0.01", hint: "nearest hundredth" },
  { id: "tenth", label: "0.1", hint: "nearest tenth" },
  { id: "half", label: "0.5", hint: "nearest half" },
  { id: "whole", label: "1", hint: "nearest whole" },
  { id: "none", label: "exact", hint: "no rounding" },
];

// --- system helpers ----------------------------------------------------------

function boundsOf(s: GradingSystem): Bounds {
  return { min: s.min, max: s.max, direction: s.direction, pass: s.pass };
}

function entryToNumber(s: GradingSystem, raw: string): number {
  if (s.kind === "scale") {
    const o = s.options?.find((o) => o.label === raw);
    return o ? o.value : NaN;
  }
  return parseFloat(raw);
}

function exampleEntry(s: GradingSystem, frac: number): string {
  if (s.kind === "scale") return labelForValue(s, exampleValue(s, frac)) ?? "";
  return String(exampleValue(s, frac));
}

function seedSubjects(s: GradingSystem): Subject[] {
  const g = (label: string, frac: number): Grade => ({ id: uid(), label, value: exampleEntry(s, frac), weight: "1" });
  return [
    { id: uid(), name: "Subject A", weight: "1", grades: [g("Test 1", 0.85), g("Test 2", 0.7)] },
    { id: uid(), name: "Subject B", weight: "1", grades: [g("Test 1", 0.6)] },
  ];
}

function seedQuick(s: GradingSystem): Grade[] {
  return [0.85, 0.7, 0.6].map((f, i) => ({ id: uid(), label: `Grade ${i + 1}`, value: exampleEntry(s, f), weight: "1" }));
}

function freshState(s: GradingSystem): Partial<State> {
  return {
    rounding: s.rounding,
    subjects: seedSubjects(s),
    quick: seedQuick(s),
    conv: { variant: "proportional", points: "", max: String(s.kind === "numeric" ? Math.round(s.max) : 30), passPct: "60" },
  };
}

const initialSystem = SYSTEMS[0];
const initial: State = {
  systemId: initialSystem.id,
  custom: null,
  chosen: false,
  view: "subjects",
  rounding: initialSystem.rounding,
  showWork: true,
  subjects: seedSubjects(initialSystem),
  quick: seedQuick(initialSystem),
  conv: { variant: "proportional", points: "", max: "6", passPct: "60" },
};

// --- small pieces ------------------------------------------------------------

function gradeColor(value: number, ok: boolean | null) {
  if (ok === null || !isFinite(value)) return "var(--muted)";
  return ok ? "var(--ink)" : "var(--no)";
}

function Verdict({ r, sys }: { r: Reckoning; sys: GradingSystem }) {
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

function Receipt({ r, show, dp }: { r: Reckoning; show: boolean; dp: number }) {
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

function field(extra = "") {
  return "rounded-md border bg-transparent px-2 py-1 text-sm outline-none transition-colors focus:border-[var(--forge)] " + extra;
}

function GradeValue({ sys, value, onChange }: { sys: GradingSystem; value: string; onChange: (v: string) => void }) {
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

// --- the first-launch / change picker ---------------------------------------

function Picker({
  open,
  mustChoose,
  onChoose,
  onClose,
}: {
  open: boolean;
  mustChoose: boolean;
  onChoose: (s: GradingSystem) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [c, setC] = useState({ name: "", min: "0", max: "100", direction: "up" as "up" | "down", pass: "60", rounding: "tenth" as Rounding });

  if (!open) return null;

  const needle = q.trim().toLowerCase();
  const list = SYSTEMS.filter(
    (s) => !needle || s.country.toLowerCase().includes(needle) || s.name.toLowerCase().includes(needle)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      style={{ background: "rgba(28,26,23,0.45)" }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !mustChoose) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border bg-paper p-5 shadow-xl" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Choose your grading system</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Pick the scale your school uses. You can change it later, and build a custom one if yours isn&apos;t here.
            </p>
          </div>
          {!mustChoose && (
            <button onClick={onClose} aria-label="Close" className="text-2xl leading-none" style={{ color: "var(--muted)" }}>×</button>
          )}
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search country or scale…"
          aria-label="Search grading systems"
          className={"mt-4 w-full " + field()}
          style={{ borderColor: "var(--line)" }}
          autoFocus
        />

        <div className="mt-3 max-h-[44vh] space-y-1 overflow-y-auto pr-1">
          {list.map((s) => (
            <button
              key={s.id}
              onClick={() => onChoose(s)}
              className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-[var(--line)] hover:bg-card"
            >
              <span className="text-xl" aria-hidden>{s.flag}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{s.name}</span>
                <span className="block text-xs" style={{ color: "var(--muted)" }}>{s.country} · {s.note}</span>
              </span>
              <span className="tnum rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>{s.short}</span>
            </button>
          ))}
          {list.length === 0 && (
            <p className="px-3 py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              No preset for that. Build a custom scale below — it covers any system.
            </p>
          )}
        </div>

        <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--line)" }}>
          <button onClick={() => setShowCustom((v) => !v)} className="text-sm font-medium" style={{ color: "var(--forge)" }}>
            {showCustom ? "− Hide custom scale" : "+ Build a custom scale"}
          </button>

          {showCustom && (
            <div className="mt-3 space-y-3">
              <input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="Name (e.g. My uni's scale)" className={"w-full " + field()} style={{ borderColor: "var(--line)" }} />
              <div className="flex flex-wrap items-end gap-3 text-xs" style={{ color: "var(--muted)" }}>
                <label>worst<input value={c.min} onChange={(e) => setC({ ...c, min: e.target.value })} inputMode="decimal" className={"tnum mt-1 block w-20 text-center " + field()} style={{ borderColor: "var(--line)" }} /></label>
                <label>best<input value={c.max} onChange={(e) => setC({ ...c, max: e.target.value })} inputMode="decimal" className={"tnum mt-1 block w-20 text-center " + field()} style={{ borderColor: "var(--line)" }} /></label>
                <label>pass mark<input value={c.pass} onChange={(e) => setC({ ...c, pass: e.target.value })} inputMode="decimal" className={"tnum mt-1 block w-20 text-center " + field()} style={{ borderColor: "var(--line)" }} /></label>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span style={{ color: "var(--muted)" }}>Better is</span>
                {(["up", "down"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setC({ ...c, direction: d })}
                    className="rounded-md border px-2.5 py-1 font-medium"
                    style={{
                      borderColor: "var(--line)",
                      background: c.direction === d ? "var(--forge)" : "transparent",
                      color: c.direction === d ? "#fff" : "var(--ink)",
                    }}
                  >
                    {d === "up" ? "higher number" : "lower number"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  const min = parseFloat(c.min), max = parseFloat(c.max), pass = parseFloat(c.pass);
                  if (!isFinite(min) || !isFinite(max) || min === max) return;
                  onChoose(
                    makeCustom({
                      name: c.name,
                      min: Math.min(min, max),
                      max: Math.max(min, max),
                      direction: c.direction,
                      pass: isFinite(pass) ? pass : undefined,
                      rounding: c.rounding,
                    })
                  );
                }}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
                style={{ background: "var(--forge)" }}
              >
                Use this scale
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- page --------------------------------------------------------------------

export default function Home() {
  const [state, setState] = useState<State>(initial);
  const [loaded, setLoaded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setState(JSON.parse(saved));
    } catch {
      /* keep the seed if storage is unavailable or corrupt */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage blocked — still works this session */
    }
  }, [state, loaded]);

  const sys: GradingSystem = useMemo(() => {
    if (state.systemId === "custom" && state.custom) return state.custom;
    return systemById(state.systemId) ?? SYSTEMS[0];
  }, [state.systemId, state.custom]);
  const b = boundsOf(sys);

  const { rounding, showWork, subjects, quick, conv, view } = state;
  const patch = (p: Partial<State>) => setState((s) => ({ ...s, ...p }));

  function choose(next: GradingSystem) {
    setState((s) => {
      const isFirst = !s.chosen;
      const base = { ...s, systemId: next.id, custom: next.id === "custom" ? next : null, chosen: true };
      return isFirst ? { ...base, ...(freshState(next) as State) } : { ...base, rounding: next.rounding };
    });
    setPickerOpen(false);
  }

  const itemsFrom = (rows: Grade[]): GradeItem[] =>
    rows
      .map((g) => ({
        value: entryToNumber(sys, g.value),
        weight: g.weight.trim() === "" ? 1 : parseFloat(g.weight),
        display: sys.kind === "scale" ? g.value || undefined : undefined,
      }))
      .filter((i) => isFinite(i.value) && isFinite(i.weight) && i.weight > 0);

  const subjectResults = useMemo(
    () => subjects.map((sub) => average(itemsFrom(sub.grades), rounding, b)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subjects, rounding, sys]
  );

  const overall = useMemo(() => {
    const items: GradeItem[] = subjects
      .map((sub, i) => ({
        value: subjectResults[i].value,
        weight: sub.weight.trim() === "" ? 1 : parseFloat(sub.weight),
        display: sub.name.trim() || undefined,
      }))
      .filter((i) => isFinite(i.value) && isFinite(i.weight) && i.weight > 0);
    return average(items, rounding, b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, subjectResults, rounding, sys]);

  const quickResult = useMemo(
    () => average(itemsFrom(quick), rounding, b),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quick, rounding, sys]
  );

  const convResult = useMemo(() => {
    const p = parseFloat(conv.points), m = parseFloat(conv.max), x = parseFloat(conv.passPct);
    return conv.variant === "proportional" ? pointsProportional(p, m, rounding, b) : pointsLinear(p, m, x, rounding, b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv, rounding, sys]);

  // mutators
  const setSubjects = (fn: (s: Subject[]) => Subject[]) => setState((s) => ({ ...s, subjects: fn(s.subjects) }));
  const editSubject = (id: string, p: Partial<Subject>) => setSubjects((subs) => subs.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const editGrade = (sid: string, gid: string, p: Partial<Grade>) =>
    setSubjects((subs) => subs.map((s) => (s.id === sid ? { ...s, grades: s.grades.map((g) => (g.id === gid ? { ...g, ...p } : g)) } : s)));
  const setQuick = (fn: (g: Grade[]) => Grade[]) => setState((s) => ({ ...s, quick: fn(s.quick) }));

  const blank = (): Grade => ({ id: uid(), label: "", value: "", weight: "1" });
  const dp = sys.decimals;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <Picker
        open={pickerOpen || (loaded && !state.chosen)}
        mustChoose={loaded && !state.chosen}
        onChoose={choose}
        onClose={() => setPickerOpen(false)}
      />

      {/* header */}
      <header className="mb-9">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xs" style={{ color: "var(--forge)" }}>λ</span>
          <h1 className="font-display text-2xl font-bold tracking-tight">rechenschaft</h1>
        </div>
        <p className="mt-1 text-[0.95rem]" style={{ color: "var(--muted)" }}>
          A grade calculator that shows its work. Every average prints the formula, the numbers, and the rounding rule that produced it.
        </p>
      </header>

      {/* controls */}
      <section className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border bg-card px-4 py-3" style={{ borderColor: "var(--line)" }}>
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm transition-colors hover:bg-paper"
          style={{ borderColor: "var(--line)" }}
          title="Change grading system"
        >
          <span aria-hidden>{sys.flag}</span>
          <span className="font-medium">{sys.name}</span>
          <span style={{ color: "var(--muted)" }}>change</span>
        </button>

        <div className="flex overflow-hidden rounded-md border" style={{ borderColor: "var(--line)" }} role="group" aria-label="View">
          {(["subjects", "quick"] as const).map((v) => {
            const active = view === v;
            return (
              <button
                key={v}
                onClick={() => patch({ view: v })}
                className="px-3 py-1 text-sm font-medium transition-colors"
                style={{ background: active ? "var(--forge)" : "transparent", color: active ? "#fff" : "var(--ink)" }}
              >
                {v === "quick" ? "quick average" : "subjects"}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: "var(--muted)" }}>round</span>
          <div className="flex overflow-hidden rounded-md border" style={{ borderColor: "var(--line)" }} role="group" aria-label="Rounding rule">
            {roundingLabels.map((r) => {
              const active = rounding === r.id;
              return (
                <button key={r.id} onClick={() => patch({ rounding: r.id })} title={r.hint} className="tnum px-2 py-1 text-sm font-medium transition-colors" style={{ background: active ? "var(--forge)" : "transparent", color: active ? "#fff" : "var(--ink)" }}>
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={showWork} onChange={(e) => patch({ showWork: e.target.checked })} className="h-4 w-4 accent-[var(--forge)]" />
          <span style={{ color: "var(--muted)" }}>show work</span>
        </label>
      </section>

      {view === "subjects" ? (
        <>
          {/* overall */}
          <section className="mb-9 rounded-xl border bg-card px-5 py-5" style={{ borderColor: "var(--line)" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>Overall average</p>
                <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>
                  weighted mean of the {subjects.length} subject grade{subjects.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="tnum font-display text-5xl font-bold leading-none" style={{ color: gradeColor(overall.value, overall.ok) }}>
                  {isFinite(overall.value) ? fmt(overall.value, dp) : "—"}
                </span>
                <Verdict r={overall} sys={sys} />
              </div>
            </div>
            <Receipt r={overall} show={showWork} dp={dp} />
          </section>

          {/* subjects */}
          <div className="space-y-5">
            {subjects.map((sub, i) => {
              const res = subjectResults[i];
              return (
                <section key={sub.id} className="rounded-xl border bg-card px-5 py-4" style={{ borderColor: "var(--line)" }}>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      value={sub.name}
                      onChange={(e) => editSubject(sub.id, { name: e.target.value })}
                      placeholder="Subject"
                      aria-label="Subject name"
                      className="font-display min-w-0 flex-1 bg-transparent text-lg font-medium outline-none placeholder:opacity-40 focus:border-b"
                      style={{ borderColor: "var(--forge)" }}
                    />
                    <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
                      weight
                      <input value={sub.weight} onChange={(e) => editSubject(sub.id, { weight: e.target.value })} inputMode="decimal" aria-label="Subject weight" className={"tnum w-12 text-center " + field()} style={{ borderColor: "var(--line)" }} />
                    </label>
                    <span className="tnum font-display text-2xl font-bold" style={{ color: gradeColor(res.value, res.ok) }}>
                      {isFinite(res.value) ? fmt(res.value, dp) : "—"}
                    </span>
                    <Verdict r={res} sys={sys} />
                    <button onClick={() => setSubjects((s) => s.filter((x) => x.id !== sub.id))} aria-label="Remove subject" className="text-lg leading-none" style={{ color: "var(--muted)", opacity: 0.5 }}>×</button>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {sub.grades.map((g) => (
                      <div key={g.id} className="flex items-center gap-2">
                        <input value={g.label} onChange={(e) => editGrade(sub.id, g.id, { label: e.target.value })} placeholder="label" aria-label="Grade label" className={"min-w-0 flex-1 " + field()} style={{ borderColor: "var(--line)" }} />
                        <GradeValue sys={sys} value={g.value} onChange={(v) => editGrade(sub.id, g.id, { value: v })} />
                        <span className="text-xs" style={{ color: "var(--muted)" }}>×</span>
                        <input value={g.weight} onChange={(e) => editGrade(sub.id, g.id, { weight: e.target.value })} placeholder="1" inputMode="decimal" aria-label="Grade weight" className={"tnum w-12 text-center " + field()} style={{ borderColor: "var(--line)" }} />
                        <button onClick={() => editSubject(sub.id, { grades: sub.grades.filter((x) => x.id !== g.id) })} aria-label="Remove grade" className="px-1 text-base leading-none" style={{ color: "var(--muted)", opacity: 0.45 }}>×</button>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => editSubject(sub.id, { grades: [...sub.grades, blank()] })} className="mt-2.5 text-sm font-medium" style={{ color: "var(--forge)" }}>+ grade</button>
                  <Receipt r={res} show={showWork} dp={dp} />
                </section>
              );
            })}
          </div>

          <button onClick={() => setSubjects((s) => [...s, { id: uid(), name: "", weight: "1", grades: [blank()] }])} className="mt-5 w-full rounded-xl border border-dashed py-3 text-sm font-medium transition-colors hover:bg-card" style={{ borderColor: "var(--line)", color: "var(--forge)" }}>+ subject</button>
        </>
      ) : (
        /* quick average */
        <section className="rounded-xl border bg-card px-5 py-5" style={{ borderColor: "var(--line)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>Average</p>
              <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>a flat list of grades — weight any that count more</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="tnum font-display text-5xl font-bold leading-none" style={{ color: gradeColor(quickResult.value, quickResult.ok) }}>
                {isFinite(quickResult.value) ? fmt(quickResult.value, dp) : "—"}
              </span>
              <Verdict r={quickResult} sys={sys} />
            </div>
          </div>
          <Receipt r={quickResult} show={showWork} dp={dp} />

          <div className="mt-4 space-y-1.5">
            {quick.map((g) => (
              <div key={g.id} className="flex items-center gap-2">
                <input value={g.label} onChange={(e) => setQuick((q) => q.map((x) => (x.id === g.id ? { ...x, label: e.target.value } : x)))} placeholder="label" aria-label="Grade label" className={"min-w-0 flex-1 " + field()} style={{ borderColor: "var(--line)" }} />
                <GradeValue sys={sys} value={g.value} onChange={(v) => setQuick((q) => q.map((x) => (x.id === g.id ? { ...x, value: v } : x)))} />
                <span className="text-xs" style={{ color: "var(--muted)" }}>×</span>
                <input value={g.weight} onChange={(e) => setQuick((q) => q.map((x) => (x.id === g.id ? { ...x, weight: e.target.value } : x)))} placeholder="1" inputMode="decimal" aria-label="Grade weight" className={"tnum w-12 text-center " + field()} style={{ borderColor: "var(--line)" }} />
                <button onClick={() => setQuick((q) => q.filter((x) => x.id !== g.id))} aria-label="Remove grade" className="px-1 text-base leading-none" style={{ color: "var(--muted)", opacity: 0.45 }}>×</button>
              </div>
            ))}
          </div>
          <button onClick={() => setQuick((q) => [...q, blank()])} className="mt-2.5 text-sm font-medium" style={{ color: "var(--forge)" }}>+ grade</button>
        </section>
      )}

      {/* points -> grade */}
      <section className="mt-12 rounded-xl border bg-card px-5 py-5" style={{ borderColor: "var(--line)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-medium">Points → grade</h2>
            <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>Turn a score into a grade on the {sys.short} scale.</p>
          </div>
          <div className="flex overflow-hidden rounded-md border text-sm" style={{ borderColor: "var(--line)" }} role="group" aria-label="Conversion formula">
            {([["proportional", "proportional"], ["linear", "pass at X%"]] as ["proportional" | "linear", string][]).map(([id, label]) => {
              const active = conv.variant === id;
              return (
                <button key={id} onClick={() => patch({ conv: { ...conv, variant: id } })} className="px-3 py-1 font-medium transition-colors" style={{ background: active ? "var(--forge)" : "transparent", color: active ? "#fff" : "var(--ink)" }}>{label}</button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="text-xs" style={{ color: "var(--muted)" }}>
            <span className="mb-1 block">points</span>
            <input value={conv.points} onChange={(e) => patch({ conv: { ...conv, points: e.target.value } })} inputMode="decimal" placeholder="0" className={"tnum w-20 text-center " + field()} style={{ borderColor: "var(--line)" }} />
          </label>
          <span className="pb-1.5 text-lg" style={{ color: "var(--muted)" }}>/</span>
          <label className="text-xs" style={{ color: "var(--muted)" }}>
            <span className="mb-1 block">max</span>
            <input value={conv.max} onChange={(e) => patch({ conv: { ...conv, max: e.target.value } })} inputMode="decimal" className={"tnum w-20 text-center " + field()} style={{ borderColor: "var(--line)" }} />
          </label>
          {conv.variant === "linear" && (
            <label className="text-xs" style={{ color: "var(--muted)" }}>
              <span className="mb-1 block">pass at %</span>
              <input value={conv.passPct} onChange={(e) => patch({ conv: { ...conv, passPct: e.target.value } })} inputMode="decimal" className={"tnum w-20 text-center " + field()} style={{ borderColor: "var(--line)" }} />
            </label>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="tnum font-display text-4xl font-bold leading-none" style={{ color: gradeColor(convResult.value, convResult.ok) }}>
              {isFinite(convResult.value) ? fmt(convResult.value, dp) : "—"}
            </span>
            <Verdict r={convResult} sys={sys} />
          </div>
        </div>
        <Receipt r={convResult} show={showWork} dp={dp} />
      </section>

      {/* footer */}
      <footer className="mt-12 border-t pt-5 text-[0.8rem] leading-relaxed" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
        <p>
          Everything stays in your browser&apos;s local storage — no accounts, no upload. The current scale is{" "}
          <span style={{ color: "var(--ink)" }}>{sys.name}</span> ({sys.note}); rounding is set above and applied half-up. Check your school&apos;s Reglement for the exact rule.
        </p>
        <p className="mt-2">
          A <a href="https://lambdaf.org/" className="underline underline-offset-2" style={{ color: "var(--forge)" }}>Lambdaforge</a> tool · open source
        </p>
        <button onClick={() => { if (confirm("Reset everything, including the chosen system?")) { setState(initial); setPickerOpen(false); } }} className="mt-3 underline underline-offset-2" style={{ color: "var(--muted)" }}>Reset everything</button>
      </footer>
    </div>
  );
}

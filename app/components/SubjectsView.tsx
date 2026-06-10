"use client";

// The subjects view: the overall average card plus one card per subject.
// Results arrive precomputed; this file only lays them out.

import { fmt, type Reckoning } from "@/lib/grades";
import type { GradingSystem } from "@/lib/systems";
import type { Subject } from "@/lib/model";
import type { Actions } from "../useGradeForge";
import { field, gradeColor, GradeRow, Receipt, ResultFigure, Verdict } from "./ui";

export function SubjectsView({
  sys,
  dp,
  showWork,
  subjects,
  results,
  overall,
  actions,
}: {
  sys: GradingSystem;
  dp: number;
  showWork: boolean;
  subjects: Subject[];
  results: Reckoning[];
  overall: Reckoning;
  actions: Pick<Actions, "addSubject" | "removeSubject" | "editSubject" | "addGrade" | "editGrade" | "removeGrade">;
}) {
  return (
    <>
      <section className="mb-9 rounded-xl border bg-card px-5 py-5" style={{ borderColor: "var(--line)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>Overall average</p>
            <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>
              weighted mean of the {subjects.length} subject grade{subjects.length === 1 ? "" : "s"}
            </p>
          </div>
          <ResultFigure r={overall} sys={sys} dp={dp} />
        </div>
        <Receipt r={overall} show={showWork} dp={dp} />
      </section>

      <div className="space-y-5">
        {subjects.map((sub, i) => {
          const res = results[i];
          return (
            <section key={sub.id} className="rounded-xl border bg-card px-5 py-4" style={{ borderColor: "var(--line)" }}>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={sub.name}
                  onChange={(e) => actions.editSubject(sub.id, { name: e.target.value })}
                  placeholder="Subject"
                  aria-label="Subject name"
                  className="font-display min-w-0 flex-1 bg-transparent text-lg font-medium outline-none placeholder:opacity-40 focus:border-b"
                  style={{ borderColor: "var(--forge)" }}
                />
                <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
                  weight
                  <input value={sub.weight} onChange={(e) => actions.editSubject(sub.id, { weight: e.target.value })} inputMode="decimal" aria-label="Subject weight" className={"tnum w-12 text-center " + field()} style={{ borderColor: "var(--line)" }} />
                </label>
                <span className="tnum font-display text-2xl font-bold" style={{ color: gradeColor(res.value, res.ok) }}>
                  {isFinite(res.value) ? fmt(res.value, dp) : "—"}
                </span>
                <Verdict r={res} sys={sys} />
                <button onClick={() => actions.removeSubject(sub.id)} aria-label="Remove subject" className="text-lg leading-none" style={{ color: "var(--muted)", opacity: 1 }}>×</button>
              </div>

              <div className="mt-3 space-y-1.5">
                {sub.grades.map((g) => (
                  <GradeRow
                    key={g.id}
                    sys={sys}
                    grade={g}
                    onEdit={(p) => actions.editGrade(sub.id, g.id, p)}
                    onRemove={() => actions.removeGrade(sub.id, g.id)}
                  />
                ))}
              </div>

              <button onClick={() => actions.addGrade(sub.id)} className="mt-2.5 text-sm font-medium" style={{ color: "var(--forge)" }}>+ exam</button>
              <Receipt r={res} show={showWork} dp={dp} />
            </section>
          );
        })}
      </div>

      <button onClick={actions.addSubject} className="mt-5 w-full rounded-xl border border-dashed py-3 text-sm font-medium transition-colors hover:bg-card" style={{ borderColor: "var(--line)", color: "var(--forge)" }}>+ subject</button>
    </>
  );
}

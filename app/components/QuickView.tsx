"use client";

// The quick-average view: one flat list of grades, one result.

import type { Reckoning } from "@/lib/grades";
import type { GradingSystem } from "@/lib/systems";
import type { Grade } from "@/lib/model";
import type { Actions } from "../useGradeForge";
import { GradeRow, Receipt, ResultFigure } from "./ui";

export function QuickView({
  sys,
  dp,
  showWork,
  grades,
  result,
  actions,
}: {
  sys: GradingSystem;
  dp: number;
  showWork: boolean;
  grades: Grade[];
  result: Reckoning;
  actions: Pick<Actions, "addQuick" | "editQuick" | "removeQuick">;
}) {
  return (
    <section className="rounded-xl border bg-card px-5 py-5" style={{ borderColor: "var(--line)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>Average</p>
          <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>a flat list of grades — weight any that count more</p>
        </div>
        <ResultFigure r={result} sys={sys} dp={dp} />
      </div>
      <Receipt r={result} show={showWork} dp={dp} />

      <div className="mt-4 space-y-1.5">
        {grades.map((g) => (
          <GradeRow
            key={g.id}
            sys={sys}
            grade={g}
            onEdit={(p) => actions.editQuick(g.id, p)}
            onRemove={() => actions.removeQuick(g.id)}
          />
        ))}
      </div>
      <button onClick={actions.addQuick} className="mt-2.5 text-sm font-medium" style={{ color: "var(--forge)" }}>+ exam</button>
    </section>
  );
}

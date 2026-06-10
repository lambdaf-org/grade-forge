import test from "node:test";
import assert from "node:assert/strict";
import {
  average,
  applyRounding,
  pointsProportional,
  pointsLinear,
  passes,
  fmt,
  type Bounds,
} from "./grades.ts";

const CH: Bounds = { min: 1, max: 6, direction: "up", pass: 4 };       // Switzerland
const DE: Bounds = { min: 1, max: 5, direction: "down", pass: 4 };     // German university

test("fmt trims trailing zeros but keeps whole numbers", () => {
  assert.equal(fmt(10), "10");
  assert.equal(fmt(4.5), "4.5");
  assert.equal(fmt(4.125), "4.125");
});

test("direction decides who passes", () => {
  assert.equal(passes(4.5, CH), true); // higher is better -> 4.5 passes
  assert.equal(passes(3.5, CH), false);
  assert.equal(passes(2.0, DE), true); // lower is better -> 2.0 passes
  assert.equal(passes(4.5, DE), false);
});

test("weighted mean with three rounding modes (CH)", () => {
  const items = [
    { value: 5, weight: 2 },
    { value: 4, weight: 1 },
  ]; // raw = 14/3 = 4.6667
  assert.equal(average(items, "half", CH).value, 4.5);
  assert.equal(average(items, "tenth", CH).value, 4.7);
  assert.equal(average(items, "whole", CH).value, 5);
  assert.equal(average(items, "half", CH).ok, true);
});

test("rounding sits on the boundary correctly", () => {
  assert.equal(applyRounding(4.25, "half").value, 4.5);
  assert.equal(applyRounding(4.75, "half").value, 5);
  assert.equal(applyRounding(4.15, "tenth").value, 4.2); // float-dust case
  assert.equal(applyRounding(3.875, "hundredth").value, 3.88);
});

test("letter labels appear in the receipt expression", () => {
  const r = average(
    [
      { value: 4.0, weight: 1, display: "A" },
      { value: 3.0, weight: 1, display: "B" },
    ],
    "hundredth",
    { min: 0, max: 4, direction: "up", pass: 2 }
  );
  assert.equal(r.value, 3.5);
  assert.match(r.steps[0].expr, /\(A\)/);
  assert.match(r.steps[0].expr, /\(B\)/);
});

test("proportional points respect direction", () => {
  // CH: 18/24 = .75 -> 1 + 5*.75 = 4.75 -> half -> 5
  assert.equal(pointsProportional(18, 24, "half", CH).value, 5);
  // DE (lower better): 80% -> 5 - 4*.8 = 1.8, and 1.8 passes
  const de = pointsProportional(80, 100, "tenth", DE);
  assert.equal(de.value, 1.8);
  assert.equal(de.ok, true);
});

test("linear points: pass mark lands exactly on the line", () => {
  assert.equal(pointsLinear(60, 100, 60, "half", CH).value, 4);   // up
  assert.equal(pointsLinear(80, 100, 60, "half", CH).value, 5);
  assert.equal(pointsLinear(60, 100, 60, "tenth", DE).value, 4);  // down, still pass mark
});

test("empty input yields no value", () => {
  const r = average([], "half", CH);
  assert.equal(r.ok, null);
  assert.equal(Number.isNaN(r.value), true);
});

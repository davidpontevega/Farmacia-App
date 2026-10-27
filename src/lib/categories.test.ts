import assert from "node:assert/strict";
import { test } from "node:test";
import { filterCategories, mergeCategories } from "./categories";

test("mergeCategories une, quita repetidas sin distinguir mayúsculas y ordena", () => {
  assert.deepEqual(mergeCategories(["Vitaminas", "Analgésico"], ["analgésico ", "Cremas", ""]), ["Analgésico", "Cremas", "Vitaminas"]);
});

test("filterCategories filtra por texto y avisa si lo escrito es nuevo", () => {
  const all = ["Analgésico", "Antibiótico", "Vitaminas"];
  assert.deepEqual(filterCategories(all, "an"), { matches: ["Analgésico", "Antibiótico"], isNew: true });
  assert.deepEqual(filterCategories(all, "vitaminas"), { matches: ["Vitaminas"], isNew: false });
  assert.deepEqual(filterCategories(all, "  "), { matches: all, isNew: false });
  assert.deepEqual(filterCategories(all, "Cremas"), { matches: [], isNew: true });
});

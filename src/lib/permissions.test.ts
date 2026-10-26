import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CASHIER_PERMISSIONS,
  PERMISSIONS,
  splitPermission,
} from "./permissions";

test("códigos únicos y con formato recurso.acción", () => {
  assert.equal(new Set(PERMISSIONS).size, PERMISSIONS.length);
  for (const code of PERMISSIONS) {
    assert.match(code, /^[a-z]+\.[a-z]+$/);
  }
});

test("el cajero solo recibe permisos que existen", () => {
  for (const code of CASHIER_PERMISSIONS) {
    assert.ok(PERMISSIONS.includes(code), code);
  }
});

test("splitPermission separa recurso y acción", () => {
  assert.deepEqual(splitPermission("sales.create"), {
    resource: "sales",
    action: "create",
  });
});

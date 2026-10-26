import assert from "node:assert/strict";
import { test } from "node:test";
import { canChangeRole, canDeactivate } from "./user.rules";

const admin = { isSelf: false, isActiveAdmin: true };

test("no se puede desactivar a uno mismo", () => {
  assert.equal(canDeactivate({ ...admin, isSelf: true, activeAdmins: 3 }), false);
});

test("no se puede desactivar al último admin activo", () => {
  assert.equal(canDeactivate({ ...admin, activeAdmins: 1 }), false);
  assert.equal(canDeactivate({ ...admin, activeAdmins: 2 }), true);
});

test("un no-admin se desactiva siempre que no sea uno mismo", () => {
  const cashier = { isSelf: false, isActiveAdmin: false, activeAdmins: 1 };
  assert.equal(canDeactivate(cashier), true);
});

test("quitar el rol admin al último admin se rechaza", () => {
  assert.equal(canChangeRole({ isActiveAdmin: true, activeAdmins: 1 }, false), false);
  assert.equal(canChangeRole({ isActiveAdmin: true, activeAdmins: 2 }, false), true);
  assert.equal(canChangeRole({ isActiveAdmin: true, activeAdmins: 1 }, true), true);
});

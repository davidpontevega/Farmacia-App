import assert from "node:assert/strict";
import { test } from "node:test";
import { canViewProof, proofCutoff, proofFileError, proofUploadError, sniffProofType } from "./proof";

const now = new Date("2026-10-27T12:00:00Z");
const sale = { userId: "u1", status: "COMPLETED", yapeAmount: 500, proofPath: null, createdAt: new Date("2026-10-27T10:00:00Z") };

test("proofFileError: tipo, vacío y tamaño", () => {
  assert.equal(proofFileError({ type: "image/jpeg", size: 1000 }), null);
  assert.ok(proofFileError({ type: "application/pdf", size: 1000 }));
  assert.ok(proofFileError({ type: "image/png", size: 0 }));
  assert.equal(proofFileError({ type: "image/webp", size: 2 * 1024 * 1024 }), null);
  assert.ok(proofFileError({ type: "image/webp", size: 2 * 1024 * 1024 + 1 }));
});

test("proofUploadError: autor, estado, Yape, duplicado y 24 h", () => {
  assert.equal(proofUploadError(sale, "u1", now), null);
  assert.equal(proofUploadError(sale, "u2", now)?.status, 403);
  assert.equal(proofUploadError({ ...sale, status: "VOIDED" }, "u1", now)?.status, 409);
  assert.equal(proofUploadError({ ...sale, yapeAmount: 0 }, "u1", now)?.status, 409);
  assert.equal(proofUploadError({ ...sale, proofPath: "proofs/x.jpg" }, "u1", now)?.status, 409);
  assert.equal(proofUploadError({ ...sale, createdAt: new Date("2026-10-26T11:59:00Z") }, "u1", now)?.status, 409);
  assert.equal(proofUploadError({ ...sale, createdAt: new Date("2026-10-26T12:00:00Z") }, "u1", now), null);
});

test("canViewProof: autor o reports.read", () => {
  assert.ok(canViewProof(sale, "u1", []));
  assert.ok(canViewProof(sale, "u2", ["reports.read"]));
  assert.ok(!canViewProof(sale, "u2", ["sales.read"]));
});

test("proofCutoff: 90 días atrás", () => {
  assert.equal(proofCutoff(now).toISOString(), "2026-07-29T12:00:00.000Z");
});

test("sniffProofType: reconoce por bytes, no por el nombre", () => {
  assert.equal(sniffProofType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(sniffProofType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])), "image/png");
  assert.equal(sniffProofType(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])), "image/webp");
  assert.equal(sniffProofType(Uint8Array.from([0x25, 0x50, 0x44, 0x46])), null);
  assert.equal(sniffProofType(new Uint8Array(0)), null);
});

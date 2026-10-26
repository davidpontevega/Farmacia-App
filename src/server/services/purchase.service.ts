import { db } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import { writeAudit } from "@/lib/audit";
import { NEW_PRODUCT_MIN_STOCK } from "@/lib/constants";
import { BusinessRuleError, ConflictError, NotFoundError } from "@/lib/errors";
import { autoLotNumber } from "@/lib/purchase-rules";
import { findDuplicateLot, nameKey, productKey, purchaseTotal } from "@/lib/purchases";
import type { CreatePurchaseInput } from "@/modules/purchases/schemas";
import * as inventoryRepo from "@/server/repositories/inventory.repository";
import * as productRepo from "@/server/repositories/product.repository";
import * as purchaseRepo from "@/server/repositories/purchase.repository";
import * as supplierRepo from "@/server/repositories/supplier.repository";
import { createLotIn } from "./inventory.service";

/**
 * Compra completa en una transacción: proveedor, productos nuevos, compra, lotes con su entrada
 * de stock, precios de venta, lo aprendido del proveedor y auditoría. Si algo falla no queda nada.
 */
export async function createPurchase(userId: string, input: CreatePurchaseInput) {
  // Solo los lotes escritos a mano pueden repetirse; los automáticos se numeran sin chocar.
  const duplicate = findDuplicateLot(
    input.items
      .filter((i) => i.lotNumber)
      .map((i) => ({ productKey: productKey(i), lotNumber: i.lotNumber! })),
  );
  if (duplicate) {
    throw new BusinessRuleError(`El lote ${duplicate} está repetido en la compra para el mismo producto`);
  }

  // Lotes escritos por producto: los automáticos nunca deben tomar uno de estos números.
  const explicitLots = new Map<string, Set<string>>();
  for (const i of input.items) {
    if (!i.lotNumber) continue;
    const key = productKey(i);
    explicitLots.set(key, (explicitLots.get(key) ?? new Set()).add(i.lotNumber));
  }

  return db.transaction(async (tx) => {
    const total = purchaseTotal(input.items) + input.otherCharges;
    const supplier = input.supplier ? await supplierRepo.findOrCreate(input.supplier, tx) : null;
    const purchase = await purchaseRepo.insertPurchase(
      {
        userId,
        supplier: supplier?.name ?? null,
        supplierId: supplier?.id ?? null,
        documentNumber: input.documentNumber ?? null,
        documentDate: input.documentDate ?? null,
        otherCharges: input.otherCharges,
        total,
      },
      tx,
    );
    const reason = `Compra ${input.documentNumber ?? purchase.id}`;

    const newProducts = new Map<string, { id: string; name: string }>();
    const rows: Parameters<typeof purchaseRepo.insertItems>[0] = [];
    // Lotes ya usados por producto (en la base y en esta misma compra), para numerar los automáticos.
    const usedLots = new Map<string, Set<string>>();
    // Lo aprendido del proveedor: el último ítem de cada código manda.
    const links = new Map<string, { productId: string; unitsPerPackage: number }>();

    for (const item of input.items) {
      let productId: string;
      let productName: string;

      if (item.productId) {
        const product = await productRepo.findById(item.productId, tx);
        if (!product || !product.isActive) {
          throw new NotFoundError("Un producto de la compra no existe o está inactivo");
        }
        productId = product.id;
        productName = product.commercialName;

        // El precio de venta indicado actualiza el del producto (se lee dentro de la
        // transacción, así dos ítems del mismo producto ven el cambio anterior).
        if (item.salePrice && item.salePrice !== product.salePrice) {
          await productRepo.update(product.id, { salePrice: item.salePrice }, tx);
          await writeAudit(tx, {
            actorId: userId,
            action: "product.updated",
            entityType: "product",
            entityId: product.id,
            changes: {
              fields: ["salePrice"],
              salePrice: { from: product.salePrice, to: item.salePrice },
            },
            metadata: { source: "purchase", purchaseId: purchase.id },
          });
        }
      } else {
        const np = item.newProduct!;
        const key = nameKey(np.commercialName);
        let created = newProducts.get(key);
        if (!created) {
          const row = await productRepo.insert(
            {
              commercialName: np.commercialName,
              genericName: np.genericName ?? null,
              laboratory: np.laboratory ?? null,
              category: np.category ?? null,
              salePrice: item.salePrice!,
              minStock: NEW_PRODUCT_MIN_STOCK,
              createdBy: userId,
            },
            tx,
          );
          await writeAudit(tx, {
            actorId: userId,
            action: "product.created",
            entityType: "product",
            entityId: row.id,
            changes: { salePrice: row.salePrice },
            metadata: { source: "purchase", purchaseId: purchase.id },
          });
          created = { id: row.id, name: row.commercialName };
          newProducts.set(key, created);
        }
        productId = created.id;
        productName = created.name;
      }

      let used = usedLots.get(productId);
      if (!used) {
        used = await inventoryRepo.lotNumbersOf(productId, tx);
        for (const n of explicitLots.get(productKey(item)) ?? []) used.add(n);
        usedLots.set(productId, used);
      }
      const lotNumber = item.lotNumber ?? autoLotNumber(item.expiryDate, used);
      used.add(lotNumber);

      let lot;
      try {
        lot = await createLotIn(
          tx,
          userId,
          productId,
          {
            lotNumber,
            expiryDate: item.expiryDate,
            purchasePrice: item.purchasePrice,
            quantity: item.quantity,
          },
          { reason, referenceId: purchase.id },
        );
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new ConflictError(
            item.lotNumber
              ? `El lote ${lotNumber} ya existe para ${productName}`
              : `No se pudo asignar el lote automático de ${productName}; vuelve a intentarlo`,
          );
        }
        throw err;
      }

      if (supplier && item.supplierCode) {
        links.set(item.supplierCode.toUpperCase(), {
          productId,
          unitsPerPackage: item.unitsPerPackage ?? 1,
        });
      }

      rows.push({
        purchaseId: purchase.id,
        productId,
        lotId: lot.id,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        salePrice: item.salePrice ?? null,
      });
    }

    await purchaseRepo.insertItems(rows, tx);
    if (supplier) {
      await supplierRepo.upsertLinks(
        [...links].map(([supplierCode, l]) => ({ supplierId: supplier.id, supplierCode, ...l })),
        tx,
      );
    }
    await writeAudit(tx, {
      actorId: userId,
      action: "purchase.created",
      entityType: "purchase",
      entityId: purchase.id,
      changes: {
        total,
        otherCharges: input.otherCharges,
        items: rows.length,
        newProducts: newProducts.size,
        supplierLinked: !!supplier,
      },
    });

    return { id: purchase.id, total };
  });
}

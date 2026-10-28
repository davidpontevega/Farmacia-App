import { eq, inArray } from "drizzle-orm";
import { db, pool } from "./index";
import {
  inventoryMovements,
  lots,
  permissions,
  products,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "./schema";
import {
  CASHIER_PERMISSIONS,
  PERMISSIONS,
  splitPermission,
} from "@/lib/permissions";

// Datos ficticios. Precios en centavos.
const SAMPLE_PRODUCTS = [
  ["Paracetamol 500mg", "Paracetamol", "Genfar", "Analgésico", 150],
  ["Ibuprofeno 400mg", "Ibuprofeno", "MK", "Antiinflamatorio", 250],
  ["Amoxicilina 500mg", "Amoxicilina", "Portugal", "Antibiótico", 400],
  ["Loratadina 10mg", "Loratadina", "Genfar", "Antialérgico", 180],
  ["Omeprazol 20mg", "Omeprazol", "MK", "Gastrointestinal", 300],
  ["Diclofenaco 50mg", "Diclofenaco", "Portugal", "Antiinflamatorio", 220],
  ["Metformina 850mg", "Metformina", "Genfar", "Antidiabético", 350],
  ["Salbutamol inhalador", "Salbutamol", "MK", "Respiratorio", 1800],
  ["Suero oral", "Sales de rehidratación", "Portugal", "Hidratación", 350],
  ["Vitamina C 500mg", "Ácido ascórbico", "Genfar", "Vitaminas", 120],
] as const;

async function seedPermissionsAndRoles() {
  await db
    .insert(permissions)
    .values(
      PERMISSIONS.map((code) => ({ code, ...splitPermission(code) })),
    )
    .onConflictDoNothing();

  await db
    .insert(roles)
    .values([
      { slug: "admin", name: "Administrador", isSystem: true },
      { slug: "cashier", name: "Cajero", isSystem: true },
    ])
    .onConflictDoNothing();

  const allRoles = await db.select().from(roles);
  const allPerms = await db.select().from(permissions);
  const admin = allRoles.find((r) => r.slug === "admin")!;
  const cashier = allRoles.find((r) => r.slug === "cashier")!;

  const grants = [
    ...allPerms.map((p) => ({ roleId: admin.id, permissionId: p.id })),
    ...allPerms
      .filter((p) => (CASHIER_PERMISSIONS as readonly string[]).includes(p.code))
      .map((p) => ({ roleId: cashier.id, permissionId: p.id })),
  ];
  await db.insert(rolePermissions).values(grants).onConflictDoNothing();
  return admin;
}

// El webhook de Clerk reconcilia este usuario por email y reemplaza el clerk_id.
async function seedSuperAdmin(adminRoleId: string) {
  const email = process.env.SUPER_ADMIN_EMAIL;
  if (!email) throw new Error("SUPER_ADMIN_EMAIL no está definida");

  await db
    .insert(users)
    .values({ clerkId: `pending:${email}`, email, name: "Super Admin" })
    .onConflictDoNothing();
  const [user] = await db.select().from(users).where(eq(users.email, email));

  await db
    .insert(userRoles)
    .values({ userId: user.id, roleId: adminRoleId })
    .onConflictDoNothing();
  return user;
}

async function seedProducts(userId: string) {
  const rows = SAMPLE_PRODUCTS.map(
    ([commercialName, genericName, laboratory, category, salePrice]) => ({
      commercialName,
      genericName,
      laboratory,
      category,
      salePrice,
      minStock: 10,
      createdBy: userId,
    }),
  );

  // Una transacción: un fallo a medias no deja productos sin lotes ni stock.
  await db.transaction(async (tx) => {
    // Sin clave única natural en products: la idempotencia es por nombre comercial.
    const names = rows.map((r) => r.commercialName);
    const existing = await tx
      .select({ commercialName: products.commercialName })
      .from(products)
      .where(inArray(products.commercialName, names));
    const have = new Set(existing.map((e) => e.commercialName));
    const missing = rows.filter((r) => !have.has(r.commercialName));
    if (missing.length > 0) await tx.insert(products).values(missing);

    const all = await tx
      .select()
      .from(products)
      .where(inArray(products.commercialName, names));

    const lotRows = all.flatMap((p) => [
      { productId: p.id, lotNumber: "L-A", expiryDate: "2027-06-30", purchasePrice: Math.round(p.salePrice * 0.6), initialQuantity: 50, createdBy: userId },
      { productId: p.id, lotNumber: "L-B", expiryDate: "2028-03-31", purchasePrice: Math.round(p.salePrice * 0.6), initialQuantity: 80, createdBy: userId },
    ]);
    const newLots = await tx.insert(lots).values(lotRows).onConflictDoNothing().returning();
    if (newLots.length === 0) return;

    await tx.insert(inventoryMovements).values(
      newLots.map((l) => ({
        productId: l.productId,
        lotId: l.id,
        userId,
        type: "ENTRY" as const,
        quantity: l.initialQuantity,
        reason: "Stock inicial (seed)",
      })),
    );
  });
}

async function main() {
  const admin = await seedPermissionsAndRoles();
  // Solo sincroniza permisos nuevos (sin tocar usuarios ni productos de ejemplo): `npm run db:permissions`.
  if (process.argv.includes("--permissions")) {
    console.log("Permisos sincronizados");
    return;
  }
  const user = await seedSuperAdmin(admin.id);
  await seedProducts(user.id);
  console.log("Seed completo");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

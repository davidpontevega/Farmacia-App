import { sql } from "drizzle-orm";
import { db } from "@/server/db";

// Todas las agregaciones son de solo lectura y los días se cuentan en hora de Lima.
const limaDay = (column: string) => sql.raw(`(${column} at time zone 'America/Lima')::date`);

const asRows = <T>(result: { rows: unknown[] }) => result.rows as T[];
const n = (v: unknown) => Number(v ?? 0);

export type Range = { from: string; to: string };

export async function salesTotals({ from, to }: Range) {
  const [row] = asRows<Record<string, unknown>>(
    await db.execute(sql`
      select
        count(*) filter (where status = 'COMPLETED') as sales_count,
        coalesce(sum(total) filter (where status = 'COMPLETED'), 0) as gross,
        coalesce(sum(cash_amount) filter (where status = 'COMPLETED'), 0) as cash,
        coalesce(sum(yape_amount) filter (where status = 'COMPLETED'), 0) as yape,
        count(*) filter (where status = 'VOIDED') as voided_count,
        coalesce(sum(total) filter (where status = 'VOIDED'), 0) as voided_cents
      from sales
      where ${limaDay("created_at")} between ${from}::date and ${to}::date`),
  );
  return {
    salesCount: n(row.sales_count),
    gross: n(row.gross),
    cash: n(row.cash),
    yape: n(row.yape),
    voidedCount: n(row.voided_count),
    voidedCents: n(row.voided_cents),
  };
}

/** Costo de compra de lo vendido (ventas completadas) y de lo devuelto en buen estado, en el período. */
export async function costs({ from, to }: Range) {
  const [sold] = asRows<{ cost: unknown }>(
    await db.execute(sql`
      select coalesce(sum(si.quantity * l.purchase_price), 0) as cost
      from sale_items si
      join sales s on s.id = si.sale_id and s.status = 'COMPLETED'
      join lots l on l.id = si.lot_id
      where ${limaDay("s.created_at")} between ${from}::date and ${to}::date`),
  );
  const [returned] = asRows<{ cost: unknown }>(
    await db.execute(sql`
      select coalesce(sum(ri.quantity * l.purchase_price), 0) as cost
      from return_items ri
      join returns r on r.id = ri.return_id
      join lots l on l.id = ri.lot_id
      where ri.product_condition = 'GOOD'
        and ${limaDay("r.created_at")} between ${from}::date and ${to}::date`),
  );
  return { sold: n(sold.cost), returned: n(returned.cost) };
}

export async function refundsByDay({ from, to }: Range) {
  const rows = asRows<{ day: string; refunded: unknown }>(
    await db.execute(sql`
      select to_char(${limaDay("created_at")}, 'YYYY-MM-DD') as day, sum(refunded_amount) as refunded
      from returns
      where ${limaDay("created_at")} between ${from}::date and ${to}::date
      group by 1`),
  );
  return rows.map((r) => ({ date: r.day, refunded: n(r.refunded) }));
}

export async function salesByDay({ from, to }: Range) {
  const rows = asRows<{ day: string; count: unknown; gross: unknown }>(
    await db.execute(sql`
      select to_char(${limaDay("created_at")}, 'YYYY-MM-DD') as day, count(*) as count, sum(total) as gross
      from sales
      where status = 'COMPLETED' and ${limaDay("created_at")} between ${from}::date and ${to}::date
      group by 1`),
  );
  return rows.map((r) => ({ date: r.day, count: n(r.count), gross: n(r.gross) }));
}

export async function salesByCashier({ from, to }: Range) {
  const rows = asRows<{ user_id: string; name: string; count: unknown; total: unknown }>(
    await db.execute(sql`
      select s.user_id, u.name, count(*) as count, sum(s.total) as total
      from sales s join users u on u.id = s.user_id
      where s.status = 'COMPLETED' and ${limaDay("s.created_at")} between ${from}::date and ${to}::date
      group by s.user_id, u.name
      order by total desc`),
  );
  return rows.map((r) => ({ userId: r.user_id, name: r.name, salesCount: n(r.count), totalCents: n(r.total) }));
}

const TOP_LIMIT = 10;
const TOP_ORDER = { units: "units", amount: "amount", profit: "profit" } as const;

export async function topProducts({ from, to }: Range, sort: keyof typeof TOP_ORDER) {
  // El nombre de la columna sale de una lista fija, nunca de la entrada.
  const order = sql.raw(TOP_ORDER[sort]);
  const rows = asRows<{ product_id: string; name: string; units: unknown; amount: unknown; profit: unknown }>(
    await db.execute(sql`
      select p.id as product_id, p.commercial_name as name,
        sum(si.quantity) as units,
        sum(si.subtotal) as amount,
        sum(si.subtotal - si.quantity * l.purchase_price) as profit
      from sale_items si
      join sales s on s.id = si.sale_id and s.status = 'COMPLETED'
      join products p on p.id = si.product_id
      join lots l on l.id = si.lot_id
      where ${limaDay("s.created_at")} between ${from}::date and ${to}::date
      group by p.id, p.commercial_name
      order by ${order} desc, p.commercial_name
      limit ${TOP_LIMIT}`),
  );
  return rows.map((r) => ({
    productId: r.product_id,
    name: r.name,
    units: n(r.units),
    amountCents: n(r.amount),
    profitCents: n(r.profit),
  }));
}

/** Una fila por producto con su stock y su valor al costo; los inactivos solo si aún tienen stock. */
export async function inventoryRows() {
  const rows = asRows<Record<string, unknown>>(
    await db.execute(sql`
      select p.id as product_id, p.commercial_name as name, p.generic_name, p.is_active,
        p.min_stock, p.sale_price,
        coalesce(sum(ls.stock), 0)::int as stock,
        coalesce(sum(ls.stock * l.purchase_price), 0)::bigint as cost_value
      from products p
      left join lot_stock ls on ls.product_id = p.id
      left join lots l on l.id = ls.lot_id
      group by p.id
      having p.is_active or coalesce(sum(ls.stock), 0) > 0
      order by p.commercial_name`),
  );
  return rows.map((r) => ({
    productId: String(r.product_id),
    name: String(r.name),
    genericName: (r.generic_name as string | null) ?? null,
    isActive: Boolean(r.is_active),
    minStock: n(r.min_stock),
    salePrice: n(r.sale_price),
    stock: n(r.stock),
    costValue: n(r.cost_value),
  }));
}

/** Lotes con stock que vencen en o antes de `until` (incluye los ya vencidos). */
export async function lotsExpiringBy(until: string) {
  const rows = asRows<Record<string, unknown>>(
    await db.execute(sql`
      select l.id as lot_id, p.id as product_id, p.commercial_name as name, l.lot_number,
        to_char(ls.expiry_date, 'YYYY-MM-DD') as expiry_date, ls.stock, l.purchase_price
      from lot_stock ls
      join lots l on l.id = ls.lot_id
      join products p on p.id = ls.product_id
      where ls.stock > 0 and ls.expiry_date <= ${until}::date
      order by ls.expiry_date, p.commercial_name`),
  );
  return rows.map((r) => ({
    lotId: String(r.lot_id),
    productId: String(r.product_id),
    name: String(r.name),
    lotNumber: String(r.lot_number),
    expiryDate: String(r.expiry_date),
    stock: n(r.stock),
    purchasePrice: n(r.purchase_price),
  }));
}

# Farmacia POS

Punto de venta para farmacia: catálogo con lotes y vencimientos (FEFO), ventas con pago mixto, caja por turnos, compras, devoluciones y reportes.

Es la reescritura de un sistema previo en .NET + Supabase al stack siguiente.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript estricto · Tailwind 4 · shadcn/ui · Neon Postgres · Drizzle ORM · Clerk · TanStack Query · Zustand · Zod · Recharts.

## Estado

| Spec | Tema | Estado |
|---|---|---|
| 001 | Esquema de datos (Drizzle + Neon) | Hecho |
| 002 | Autenticación (Clerk, solo por invitación) y permisos | Hecho |
| 003 | Productos, lotes e inventario (ajustes y kardex) | Hecho |
| 004 | Caja (turnos, retiros, canjes y cierre) | Hecho |
| 005 | Ventas y punto de venta (FEFO, pagos, anulación) | Hecho |
| 006 | Devoluciones (por ticket, reembolso en efectivo) | Hecho |
| 007 | Compras (ingreso de mercadería, productos nuevos, historial) | Hecho |
| 008 | Registro ágil de compras (tabla, proveedor, unidades, pegar filas) | Hecho |
| 009 | Leer la cotización desde imagen o PDF (OCR en el navegador) | Hecho |
| 010 | Reportes (ventas, inventario valorizado, alertas) | Hecho |
| 011 | Rediseño visual (tema médico, menú lateral, cajero y administrador, marca NicFarma) | Hecho |
| 012 | Ubicación del producto en el estante (estante y fila) | Hecho |
| 013 | Consulta de medicamentos por síntoma | Hecho |
| 014 | Constancia de pago Yape/Plin (foto de la transferencia) | Hecho |
| 015 | Receta asistida, etapa 1 (lista de medicamentos a carrito) | Hecho |
| 016 | Receta asistida, etapa 2 (foto recortada a lista, piloto Gemini gratis) | Hecho |
| 017 | Faltantes (medicamentos pedidos que no hay, para compras) | Hecho |
| 018 | «No lo tengo»: faltante desde la búsqueda de /pos | Hecho |
| 019 | Cerrar faltantes al registrar la compra que los cubre | Hecho |
| 020 | Nombres alternativos de producto (alias) | Hecho |
| 021 | Diccionario de síntomas ampliado y consultas sin resultado | Hecho |

Los specs viven en [`docs/specs/`](docs/specs). La arquitectura y la estructura de carpetas están en [`docs/SETUP.md`](docs/SETUP.md); las reglas del proyecto, en [`CLAUDE.md`](CLAUDE.md).

## Puesta en marcha

Requisitos: Node 20 o superior, una base en [Neon](https://neon.tech) y una aplicación en [Clerk](https://clerk.com).

```bash
npm install
cp .env.example .env.local   # completar los valores
npm run db:migrate
npm run db:seed
npm run dev                  # http://localhost:3000
```

`.npmrc` fija `legacy-peer-deps=true`: los peers opcionales de `@hookform/resolvers` chocan con zod.

### Variables de entorno

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Cadena de conexión de Neon |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Claves de la app de Clerk |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Firma del webhook (opcional en local) |
| `SUPER_ADMIN_EMAIL` | Correo del administrador inicial; lo usa `db:seed` |
| `NEXT_PUBLIC_APP_URL` | URL base; los enlaces de invitación apuntan aquí (obligatoria en producción) |

### Configurar Clerk

1. En **Configure → Access mode**, elegir **Invite-only**.
2. En **User & authentication**, dejar activos solo correo y contraseña; quitar los proveedores sociales en **SSO connections**.
3. Crear en **Users** el usuario con el mismo correo que `SUPER_ADMIN_EMAIL`. En su primer inicio de sesión queda enlazado al administrador sembrado.
4. Opcional: registrar `<URL>/api/webhooks/clerk` con los eventos `user.created`, `user.updated` y `user.deleted`. Sin el webhook todo funciona; el enlace se hace en el primer inicio de sesión.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` / `build` | Servidor de desarrollo / build de producción |
| `npm run typecheck` / `lint` / `test` | Verificaciones |
| `npm run db:generate` | Genera una migración desde el esquema |
| `npm run db:migrate` | Aplica las migraciones |
| `npm run db:seed` | Permisos, roles, super admin y productos de ejemplo (idempotente) |
| `npm run db:studio` | Explorador de la base |

## Cómo está organizado

```
Componente -> hook (TanStack Query) -> service (axios) -> Route Handler
           -> repositorio -> Drizzle -> Neon Postgres
```

- **Autenticación** la resuelve Clerk; **autorización**, Postgres: cada endpoint exige un código de permiso (`requirePermission('sales.create')`) y comprueba que el usuario siga activo.
- **Dinero** en enteros (centavos), nunca decimales.
- **Ventas, caja y stock** se escriben siempre dentro de una transacción.
- El stock de un lote es la suma de sus movimientos; no hay columna de stock que pueda desincronizarse.

## Cómo se trabaja

Cada cambio parte de un spec en `docs/specs/NNN-slug.md` que se aprueba antes de escribir código. Los agentes de `.claude/agents/` (orchestrator, spec, developer, reviewer) siguen ese flujo.

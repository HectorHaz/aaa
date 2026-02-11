# ERD (resumen textual)

Entidades clave:
- `tenants` 1-N `users`, `customers`, `products`, `quotes`, `invoices`, etc.
- `users` N-N roles mediante `user_roles`.
- `customers` 1-N `quotes` e `invoices`.
- `products` 1-N `quote_items`, `invoice_items`, `inventory_movements`.
- `quotes` 1-N `quote_items`; `quotes` 1-1/N `invoices`.
- `invoices` 1-N `invoice_items`, 1-N `payments`, 1-N `dgii_submissions`.
- `ar_ledger` registra saldo CxC por evento.
- `audit_events` registra before/after.

Ver detalle SQL en `apps/api/src/db/schema.sql`.

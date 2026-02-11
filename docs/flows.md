# Flujos clave

## Cotización → Factura → Cobro
1. Crear cotización (`POST /quotes`).
2. Convertir a factura (`POST /quotes/:id/convert-to-invoice`).
3. API crea `invoices`, `invoice_items`, movimiento inventario de salida, y asiento CxC en `ar_ledger`.
4. Registrar pago parcial (`POST /payments`) y actualizar balance.

## Compra → Inventario → Pago (base MVP)
1. Registrar entrada inventario por `POST /inventory/movements` (tipo `purchase`).
2. En fases posteriores se conectará con módulo compras y CxP.

## Nómina → Asientos (plan)
- Fase 3: cálculo nómina parametrizable, genera póliza automática.

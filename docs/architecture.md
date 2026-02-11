# Arquitectura

## Capas
- **Presentación**: React/Vite para operaciones rápidas.
- **Aplicación**: API Express por módulos (auth, ventas, inventario, facturación, pagos).
- **Persistencia**: PostgreSQL con tablas multi-tenant (`tenant_id`).
- **Integraciones**: Adapters para DGII/pagos/WhatsApp (mock en MVP).

## Seguridad MVP
- JWT access/refresh.
- RBAC por roles: Admin, Contabilidad, Ventas, Almacen, RRHH, Caja, Auditor.
- Tabla `audit_events` para trazabilidad de operaciones sensibles.
- Secretos en env vars.

## Módulos y adapters
- `dgii_submissions`: abstracto para proveedor real + mock.
- Cola (Redis) provisionada en Compose para trabajos asíncronos en fases siguientes.

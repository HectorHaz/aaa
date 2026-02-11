# ERP Todo-en-Uno PyME RD (MVP + Roadmap)

Monorepo con base técnica para ERP en RD, implementando **Fase 0 + Fase 1**: Auth/RBAC, clientes, productos, inventario básico, cotizaciones, conversión a factura, pseudo-PDF, pagos parciales y CxC.

## Stack
- API: Node.js + Express + PostgreSQL.
- Web: React + Vite.
- Infra: Docker Compose (PostgreSQL, Redis, API, Web).

## Estructura de carpetas propuesta
```txt
apps/
  api/                  # Backend por módulos + migraciones + seeds + tests
  web/                  # UI mínima para flujo principal
/docs                   # arquitectura, ERD, flujos, DGII y decisiones
/postman                # colección de endpoints
docker-compose.yml
```

## Supuestos explícitos
1. Se usa un tenant demo por instalación inicial.
2. El PDF en MVP es un binario simple (placeholder) para validar flujo; en Beta se sustituye por motor real.
3. Integración DGII se entrega como adapter + mock; proveedor real pendiente.

## Decisiones pendientes (críticas)
| Tema | Placeholder actual | Decisión pendiente |
|---|---|---|
| Proveedor DGII | `mock-provider` | Seleccionar proveedor certificado y credenciales.
| NCF/Series fiscales | `FAC-XXXXXXXX` | Definir secuencias legales y política de anulaciones.
| Tasa ITBIS/retenciones | `taxRate` configurable por línea | Definir matrices por tipo de contribuyente.
| Pasarela de pagos | Adapter no implementado en Fase 1 | Seleccionar Azul/Carnet/PayPal y alcance.
| Nómina TSS/Infotep | Tabla parametrizable planificada Fase 3 | Definir fórmulas y períodos oficiales.

## Instalación local (Docker)
```bash
docker compose up --build
```
Servicios:
- API: http://localhost:4000
- Web: http://localhost:5173

## Variables de entorno API
Ver `apps/api/.env.example`.

## Comandos útiles sin Docker
```bash
npm install
npm run db:migrate -w apps/api
npm run db:seed -w apps/api
npm run dev -w apps/api
npm run dev -w apps/web
npm test -w apps/api
```

## Demo script (paso a paso)
1. Ejecutar migraciones y seed.
2. Login con `admin@demo.do / Admin1234!`.
3. Crear cliente.
4. Crear producto.
5. Crear cotización con ítems.
6. Convertir cotización a factura.
7. Descargar pseudo-PDF (`GET /invoices/:id/pdf`).
8. Registrar pago parcial (`POST /payments`).
9. Verificar CxC (`GET /ar/ledger`).

## Estado por fases
- ✅ Fase 0: inicialización monorepo, Docker, lint, tests, docs base.
- ✅ Fase 1: módulos MVP core implementados.
- ⏳ Fase 2-5: backlog en `docs/backlog-issues.md`.

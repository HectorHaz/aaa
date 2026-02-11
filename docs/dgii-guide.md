# Guía DGII (base técnica MVP)

## Implementado
- Tabla `dgii_submissions`.
- Endpoint mock `POST /dgii/submissions/mock` con status, request/response y reintentos.
- Diseño orientado a adapter para proveedor real.

## Pendiente para producción
1. Contrato con proveedor certificado.
2. Manejo real de certificados/firmas.
3. NCF/series y reglas de contingencia.
4. Webhooks de acuse y consulta de estatus real.
5. Monitoreo y alertas de rechazo.

## No incluido
- Certificación automática DGII.

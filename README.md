# KTM — Kayard Transport Management

Sistema de gestión de transporte de Kayard (Next.js 16 + Supabase), con la misma lógica de la app que se tenía en AppSheet (ver `docs/appsheet-estructura.md`).

## Flujo

1. **Servicios**: alta del servicio → genera ID TRACK `KTL0001` con estatus *Programado* → WhatsApp de confirmación al cliente.
2. **Asignar transporte**: transportista, operador, placas y económicos → estatus *Asignado al transporte* → WhatsApp al transportista y link al operador.
3. **Operador** (`/operador/<token>`, sin contraseña): marca *En carga → En tránsito → En descarga → Finalizado*, manda su ubicación y sube fotos de evidencia.
4. **Monitoreo**: tablero por estatus, cambio manual de estatus, mapa y bitácora.
5. **Costos y venta**: se llenan solos con las tarifas de compra/venta (transportista o cliente + unidad + carga + origen + destino); utilidad y margen por concepto; *Mandar a facturar* por WhatsApp.
6. **Indicadores**: filtros por fechas, año, mes, cliente y transportista.

## Variables de entorno

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave pública (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor: alta de usuarios y cambio de contraseña |
| `NEXT_PUBLIC_FACTURACION_WHATSAPP` | (Opcional) WhatsApp de quien factura |
| `NEXT_PUBLIC_FACTURACION_NOMBRE` | (Opcional) Nombre de quien factura |

## Base de datos

El esquema completo está en `supabase/migrations/001_ktm_schema.sql` (tablas, ID TRACK, bitácora de estatus, cálculo de costos, funciones del operador, RLS y bucket `evidencias`).

## Desarrollo

```bash
npm install
npm run dev
```

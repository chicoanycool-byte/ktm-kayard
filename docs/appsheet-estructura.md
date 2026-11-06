# KTM Kayard Transport Management — estructura de la app en AppSheet

Fuente: documentación de AppSheet (versión 1.000460, generada el 6/11/2026).
Resumen: 24 tablas, 398 columnas, 1 slice, 86 vistas (22 propias), 2 reglas de formato, 109 acciones (15 propias), 0 bots.
Origen de datos: Google Sheets "KTM Kayard Transport Management".

## Flujo principal

1. **Agregar Nuevo Servicio** → genera ID TRACK `KTL0001` (consecutivo).
   Al guardar: acción *Estatus / Enviar Info* = crea registro en *Estatus del servicio* con ESTATUS "Programado" + abre WhatsApp al contacto del cliente con la confirmación.
2. **Agregar Transporte al Servicio** (se elige el ID TRACK; jala todos los datos del servicio).
   Se captura línea de transporte, operador, placas, económicos, licencia.
   Al guardar: *Estatus / Enviar Info al Proveedor* = crea registro en *Estatus del servicio* con ESTATUS "Asignado al transporte" + WhatsApp al contacto del transportista.
3. **Vista Operadores / TU SERVICIO ASIGNADO**: el operador recibe un link por WhatsApp, ve su servicio, sube evidencias (fotos, ubicación) y marca ESTATUS "Finalizado".
4. **Costos y Venta**: por ID TRACK; costos y ventas se buscan automáticamente en las tarifas con la llave concatenada (proveedor/cliente + unidad + carga + origen + destino). Calcula utilidad y margen por concepto y total.
5. **Mandar Facturar**: WhatsApp a facturación (César) con el desglose de venta.
6. **Indicadores**: filtro por rango de fechas, año, mes, cliente y proveedor.

## Estatus del servicio

Programado (rojo) → Asignado al transporte (naranja) → Finalizado / Cancelado.

## Tablas

### Agregar Nuevo Servicio (servicios)
- ID TRACK — texto, llave. Inicial: "KTL" + consecutivo de 4 dígitos.
- Fecha (hoy), Año, Mes, Semana — calculados, ocultos.
- Cliente → Clientes
- Tipo de Unidad → Tipos de unidades
- Tipo de Carga → Tipos de cargas
- Costo de mercancía — precio
- Origen de Carga → Poblaciones; Fecha Carga — fecha
- Destino Descarga → Poblaciones; Fecha Descarga — fecha
- Sección DATOS CARGA: Cliente de Carga → Clientes Carga Descarga; Cita de Carga (hora); Domicilio, Colonia, CP (se jalan del cliente de carga)
- Sección DATOS DESCARGA: igual que carga
- Sección REQUERIMIENTOS: Fumigación, GPS, Cuenta Espejo, Póliza Seguro, SUA — SI / NO / N/A
- COMENTARIOS
- Teléfono y nombre de contacto del cliente — se jalan de Clientes

### Agregar Nuevo Cliente (clientes)
Nombre del Cliente (llave), Nombre del Contacto, Teléfono del Contacto, Logo (imagen).

### Clientes Carga Descarga
Cliente (llave), Domicilio, Colonia, CP.

### Proveedores dados de alta (transportistas)
Nombre de Transportista (llave), Nombre del contacto, Teléfono de contacto.

### Catálogo de operadores
Nombre del Operador (llave), Teléfono, Folio Licencia, Transportista → Proveedores.

### Agregar Transporte al Servicio (asignaciones)
- ID TRACK → Servicio (llave). Fecha/Año/Mes/Semana calculados.
- Todos los datos del servicio se muestran de solo lectura (cliente, unidad, carga, origen/destino, fechas, carga/descarga, requerimientos, comentarios).
- DATOS DEL TRANSPORTE: Línea de Transporte → Proveedores; Nombre Operador → Operadores; Teléfono operador (se jala); Placas Unidad; Económico Unidad; Placas Caja; Económico Caja; Folio Licencia.
- ESTATUS: Finalizado / Cancelado. Ubicación (lat/long), Evidencias (imagen).
- Contacto y teléfono del transportista (se jalan). Link Vista para el operador.

### Vista Operadores
ID TRACK → Asignación; datos del servicio y transporte de solo lectura; ESTATUS (Finalizado); Ubicación; Evidencias; lista de fotos.

### Evidencias
ID, ID TRACK → Vista Operadores, FOTO (imagen), Fecha (ahora).

### Tarifas (compra)
ID, Línea de Transporte → Proveedores, Tipo de Unidad, Tipo de Carga, Origen, Destino, Costo Flete, Costo Maniobras, Costo Estadías, Seguro de mercancía.

### Tarifas Venta
ID, Cliente → Clientes, Tipo de Unidad, Tipo de Carga, Origen, Destino, Venta Flete, Venta Maniobra, Venta Estadías, Seguro de mercancía.

### Costos y Venta
- ID TRACK → Asignación. Fecha = fecha de carga; Año/Mes/Semana.
- Datos generales: Cliente, Origen, Destino, Unidad, Carga, Línea de Transporte.
- Por concepto (Transporte/Flete, Maniobra, Estadías, Seguro): Costo, Venta, Utilidad = Venta − Costo, Margen = Utilidad / Venta.
  Costo y venta de flete, maniobra y estadías se buscan en Tarifas / Tarifas Venta. Seguro se captura manual.
- Totales: Total Costo, Total Venta, Utilidad Total, % Margen Total.
- Ocultos: Estatus Pago, Estatus Viaje, Factura Bonyard, Factura Proveedor.

### Catálogos simples
- Tipos de unidades (ej. Trailer, 1.5 tons)
- Tipos de cargas
- Poblaciones

### Menú y permisos
- MENU, SubMenu Compras, Submenu Clientes (Ventas), Submenu Servicios, Submenu Finanzas: cada renglón = MENU (nombre), ICONO, VISTA (a qué pantalla lleva), PERMISOS.
- Permisos para los Menus: catálogo de roles.

### Auxiliares
- Estatus del servicio: bitácora de cambios de estatus (copia de los datos del servicio + transporte + ESTATUS).
- Concentrado: vista plana de todo (servicio + transporte + costos/ventas) para reportes.
- Filtros Indicadores: Fecha inicial/final, Año, Mes, Cliente, Proveedor.

## Vistas propias (menú)

| Vista | Tipo |
|---|---|
| Menú (inicio, galería de módulos) / Dashboard | galería |
| Servicios, Compras, Ventas, Finanzas | submenús (deck) |
| Agregar Nuevo Servicio | formulario |
| Agregar Transporte al Servicio | formulario |
| Agregar Nuevo Cliente / Transportista | formulario |
| Agregar Tarifas de Compra / Venta | formulario |
| Mandar Facturar | formulario (Costos y Venta) |
| Monitoreo de Servicios | tabla: ESTATUS, ID TRACK, Cliente, Origen, Unidad, Carga, Fecha carga, Fecha descarga |
| Servicios Asignados | tabla |
| Transportes Asignados | tabla |
| Servicios Facturados | tabla con costos, ventas, utilidades y márgenes |
| Catálogo de Clientes | galería |
| Catálogo de Operadores / Proveedores | tabla |
| Ver Tarifas de Compra / Venta | tabla |
| TU SERVICIO ASIGNADO | formulario del operador |
| Filtros | formulario de indicadores |

## Acciones propias

- Estatus Programado / Estatus Planeado: insertan en Estatus del servicio.
- Enviar Info a Cliente, Enviar Información al Transporte, Enviar link a Operador, Enviar facturar: mensajes de WhatsApp (api.whatsapp.com/send?phone=+52...).
- Asignar Transporte al Servicio: abre el formulario de asignación con el ID TRACK.
- Enviar al Operador: abre TU SERVICIO ASIGNADO.
- Ir a Vista (menús): navegan a la vista guardada en el renglón del menú.

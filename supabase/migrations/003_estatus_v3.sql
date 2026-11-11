-- Estatus definitivos: Programado → Asignado al transporte → Llegada a carga → En tránsito
-- → Llegada a descarga → Entrega de documentos (fotos solo con cámara) → Finalizado  (+ Cancelado)
alter table public.servicios drop constraint if exists servicios_estatus_check;
update public.servicios set estatus = 'llegada_carga' where estatus in ('en_carga','espera_documentos');
update public.servicios set estatus = 'llegada_descarga' where estatus = 'en_descarga';
update public.servicio_estatus set estatus = 'llegada_carga' where estatus in ('en_carga','espera_documentos');
update public.servicio_estatus set estatus = 'llegada_descarga' where estatus = 'en_descarga';
alter table public.servicios add constraint servicios_estatus_check
  check (estatus in ('programado','asignado','llegada_carga','en_transito','llegada_descarga','entrega_documentos','finalizado','cancelado'));
-- operador_actualizar: acepta los nuevos estatus y exige al menos una foto de documentos antes de "finalizado"

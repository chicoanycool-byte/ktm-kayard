-- Nuevo estatus "En espera de documentos" (después de En carga) y fotos de documentos solo con cámara
alter table public.servicios drop constraint if exists servicios_estatus_check;
alter table public.servicios add constraint servicios_estatus_check
  check (estatus in ('programado','asignado','en_carga','espera_documentos','en_transito','en_descarga','finalizado','cancelado'));

alter table public.evidencias add column if not exists tipo text not null default 'evidencia'
  check (tipo in ('evidencia','documentos'));

-- operador_actualizar: acepta espera_documentos y exige al menos una foto de documentos antes de "en_transito"
-- operador_evidencia(p_token, p_path, p_tipo): guarda el tipo de foto
-- operador_servicio: regresa el tipo de cada evidencia
-- (ver definiciones completas aplicadas en Supabase, migración ktm_estatus_espera_documentos)

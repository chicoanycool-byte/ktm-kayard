-- Un servicio de un cliente bloqueado no avanza mientras la carga no haya salido.
-- Se frenan asignar, llegar a cargar y salir a tránsito; si la unidad ya va en camino
-- se le deja terminar, y cancelar siempre se puede.
create or replace function public.trg_avance_cliente_bloqueado()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nombre text; v_motivo text;
begin
  if new.estatus is distinct from old.estatus
     and new.estatus in ('asignado', 'llegada_carga', 'en_transito') then
    select nombre, bloqueo_motivo into v_nombre, v_motivo
    from clientes where id = new.cliente_id and bloqueado;
    if found then
      raise exception 'El cliente % está bloqueado (%). El servicio no puede avanzar hasta que Finanzas lo libere.',
        v_nombre, coalesce(nullif(v_motivo, ''), 'cartera vencida');
    end if;
  end if;
  return new;
end $$;

drop trigger if exists servicios_avance_bloqueado on public.servicios;
create trigger servicios_avance_bloqueado before update on public.servicios
for each row execute function public.trg_avance_cliente_bloqueado();

-- Datos que ve el operador con su liga. Se enlistan campo por campo a propósito:
-- la vista trae costos y ventas, y eso no debe salir por un token público.
create or replace function public.operador_servicio(p_token uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id_track', v.id_track, 'estatus', v.estatus, 'cliente', v.cliente,
    'origen', v.origen, 'destino', v.destino,
    'fecha_carga', v.fecha_carga, 'cita_carga', v.cita_carga,
    'fecha_descarga', v.fecha_descarga, 'cita_descarga', v.cita_descarga,
    'cliente_carga', v.cliente_carga, 'carga_domicilio', v.carga_domicilio,
    'carga_colonia', v.carga_colonia, 'carga_cp', v.carga_cp, 'carga_ubicacion', v.carga_ubicacion,
    'cliente_descarga', v.cliente_descarga, 'descarga_domicilio', v.descarga_domicilio,
    'descarga_colonia', v.descarga_colonia, 'descarga_cp', v.descarga_cp, 'descarga_ubicacion', v.descarga_ubicacion,
    'tipo_unidad', v.tipo_unidad, 'tipo_carga', v.tipo_carga, 'comentarios', v.comentarios,
    'proveedor', v.proveedor, 'operador', v.operador,
    'placas_unidad', v.placas_unidad, 'placas_caja', v.placas_caja, 'economico_unidad', v.economico_unidad,
    'req_fumigacion', v.req_fumigacion, 'req_gps', v.req_gps,
    'req_cuenta_espejo', v.req_cuenta_espejo, 'req_sua', v.req_sua,
    'cliente_bloqueado', coalesce(c.bloqueado, false),
    'cliente_bloqueo_motivo', c.bloqueo_motivo,
    'evidencias', coalesce((
      select json_agg(json_build_object('path', e.foto_path, 'fecha', e.created_at, 'tipo', e.tipo) order by e.created_at)
      from evidencias e where e.servicio_id = v.id), '[]'::json)
  )
  from v_servicios v
  left join clientes c on c.id = v.cliente_id
  where v.token_operador = p_token;
$$;

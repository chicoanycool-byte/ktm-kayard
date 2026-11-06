-- KTM Kayard Transport Management — esquema basado en la app de AppSheet
-- Estatus: programado → asignado → en_carga → en_transito → en_descarga → finalizado | cancelado

create extension if not exists pgcrypto;

-- ───────────── Perfiles / roles ─────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'operaciones'
    check (role in ('admin','direccion','operaciones','compras','ventas','facturacion','monitoreo')),
  is_active boolean not null default true,
  last_login timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          new.email,
          coalesce(new.raw_user_meta_data->>'role', 'operaciones'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and is_active);
$$;

-- ───────────── Catálogos simples ─────────────
create table if not exists public.tipos_unidad (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tipos_carga (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.poblaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ───────────── Clientes ─────────────
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  contacto_nombre text,
  contacto_telefono text,
  correo text,
  rfc text,
  logo_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Clientes de carga / descarga (remitentes y destinatarios)
create table if not exists public.clientes_cd (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  domicilio text,
  colonia text,
  codigo_postal text,
  poblacion_id uuid references public.poblaciones(id),
  link_ubicacion text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ───────────── Proveedores (líneas de transporte) y operadores ─────────────
create table if not exists public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  contacto_nombre text,
  contacto_telefono text,
  correo text,
  rfc text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.operadores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  folio_licencia text,
  proveedor_id uuid references public.proveedores(id),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ───────────── Tarifas ─────────────
create table if not exists public.tarifas_compra (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedores(id),
  tipo_unidad_id uuid not null references public.tipos_unidad(id),
  tipo_carga_id uuid not null references public.tipos_carga(id),
  origen_id uuid not null references public.poblaciones(id),
  destino_id uuid not null references public.poblaciones(id),
  costo_flete numeric(12,2) not null default 0,
  costo_maniobras numeric(12,2) not null default 0,
  costo_estadias numeric(12,2) not null default 0,
  seguro numeric(12,2) not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (proveedor_id, tipo_unidad_id, tipo_carga_id, origen_id, destino_id)
);

create table if not exists public.tarifas_venta (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id),
  tipo_unidad_id uuid not null references public.tipos_unidad(id),
  tipo_carga_id uuid not null references public.tipos_carga(id),
  origen_id uuid not null references public.poblaciones(id),
  destino_id uuid not null references public.poblaciones(id),
  venta_flete numeric(12,2) not null default 0,
  venta_maniobra numeric(12,2) not null default 0,
  venta_estadias numeric(12,2) not null default 0,
  seguro numeric(12,2) not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (cliente_id, tipo_unidad_id, tipo_carga_id, origen_id, destino_id)
);

-- ───────────── Servicios (incluye la asignación de transporte) ─────────────
create sequence if not exists public.id_track_seq start 1;

create table if not exists public.servicios (
  id uuid primary key default gen_random_uuid(),
  id_track text not null unique default ('KTL' || lpad(nextval('public.id_track_seq')::text, 4, '0')),
  fecha date not null default current_date,
  cliente_id uuid not null references public.clientes(id),
  tipo_unidad_id uuid references public.tipos_unidad(id),
  tipo_carga_id uuid references public.tipos_carga(id),
  costo_mercancia numeric(14,2),
  origen_id uuid references public.poblaciones(id),
  fecha_carga date,
  destino_id uuid references public.poblaciones(id),
  fecha_descarga date,
  cliente_carga_id uuid references public.clientes_cd(id),
  cita_carga time,
  cliente_descarga_id uuid references public.clientes_cd(id),
  cita_descarga time,
  req_fumigacion text check (req_fumigacion in ('SI','NO','N/A')),
  req_gps text check (req_gps in ('SI','NO','N/A')),
  req_cuenta_espejo text check (req_cuenta_espejo in ('SI','NO','N/A')),
  req_poliza_seguro text check (req_poliza_seguro in ('SI','NO','N/A')),
  req_sua text check (req_sua in ('SI','NO','N/A')),
  comentarios text,
  -- Datos del transporte (Agregar Transporte al Servicio)
  proveedor_id uuid references public.proveedores(id),
  operador_id uuid references public.operadores(id),
  placas_unidad text,
  economico_unidad text,
  placas_caja text,
  economico_caja text,
  folio_licencia text,
  asignado_at timestamptz,
  -- Seguimiento
  estatus text not null default 'programado'
    check (estatus in ('programado','asignado','en_carga','en_transito','en_descarga','finalizado','cancelado')),
  ultima_lat double precision,
  ultima_lng double precision,
  token_operador uuid not null unique default gen_random_uuid(),
  finalizado_at timestamptz,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists servicios_estatus_idx on public.servicios(estatus);
create index if not exists servicios_fecha_carga_idx on public.servicios(fecha_carga);
create index if not exists servicios_cliente_idx on public.servicios(cliente_id);
create index if not exists servicios_proveedor_idx on public.servicios(proveedor_id);

-- Bitácora de estatus (equivale a "Estatus del servicio")
create table if not exists public.servicio_estatus (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  estatus text not null,
  comentario text,
  lat double precision,
  lng double precision,
  origen text not null default 'sistema', -- sistema | operador
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists servicio_estatus_servicio_idx on public.servicio_estatus(servicio_id);

create or replace function public.servicios_bitacora() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.estatus is distinct from old.estatus then
    insert into servicio_estatus (servicio_id, estatus, lat, lng, origen, created_by)
    values (new.id, new.estatus, new.ultima_lat, new.ultima_lng,
            case when auth.uid() is null then 'operador' else 'sistema' end, auth.uid());
    if new.estatus = 'finalizado' then new.finalizado_at := now(); end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- BEFORE para poder fijar finalizado_at / updated_at; la bitácora del INSERT va en AFTER
create or replace function public.servicios_bitacora_ins() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into servicio_estatus (servicio_id, estatus, created_by) values (new.id, new.estatus, auth.uid());
  return null;
end $$;

drop trigger if exists servicios_upd on public.servicios;
create trigger servicios_upd before update on public.servicios
  for each row execute function public.servicios_bitacora();
drop trigger if exists servicios_ins on public.servicios;
create trigger servicios_ins after insert on public.servicios
  for each row execute function public.servicios_bitacora_ins();

-- Evidencias (fotos que sube el operador o el equipo)
create table if not exists public.evidencias (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  foto_path text not null,
  comentario text,
  created_at timestamptz not null default now()
);
create index if not exists evidencias_servicio_idx on public.evidencias(servicio_id);

-- ───────────── Costos y venta ─────────────
create table if not exists public.costos_venta (
  servicio_id uuid primary key references public.servicios(id) on delete cascade,
  costo_flete numeric(12,2) not null default 0,
  venta_flete numeric(12,2) not null default 0,
  costo_maniobra numeric(12,2) not null default 0,
  venta_maniobra numeric(12,2) not null default 0,
  costo_estadias numeric(12,2) not null default 0,
  venta_estadias numeric(12,2) not null default 0,
  costo_seguro numeric(12,2) not null default 0,
  venta_seguro numeric(12,2) not null default 0,
  total_costo numeric(14,2) generated always as (costo_flete + costo_maniobra + costo_estadias + costo_seguro) stored,
  total_venta numeric(14,2) generated always as (venta_flete + venta_maniobra + venta_estadias + venta_seguro) stored,
  utilidad numeric(14,2) generated always as
    ((venta_flete + venta_maniobra + venta_estadias + venta_seguro) - (costo_flete + costo_maniobra + costo_estadias + costo_seguro)) stored,
  estatus_pago text not null default 'pendiente' check (estatus_pago in ('pendiente','pagado')),
  estatus_facturacion text not null default 'por_facturar' check (estatus_facturacion in ('por_facturar','enviado','facturado')),
  factura_kayard text,
  factura_proveedor text,
  enviado_facturar_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Busca tarifas para un servicio (equivale a los LOOKUP con "Concatenar Compra/Venta")
create or replace function public.tarifas_para_servicio(p_servicio uuid)
returns table (
  costo_flete numeric, costo_maniobra numeric, costo_estadias numeric, costo_seguro numeric,
  venta_flete numeric, venta_maniobra numeric, venta_estadias numeric, venta_seguro numeric,
  tiene_compra boolean, tiene_venta boolean
) language sql stable set search_path = public as $$
  with s as (select * from servicios where id = p_servicio),
  c as (select tc.* from tarifas_compra tc, s
        where tc.activo and tc.proveedor_id = s.proveedor_id and tc.tipo_unidad_id = s.tipo_unidad_id
          and tc.tipo_carga_id = s.tipo_carga_id and tc.origen_id = s.origen_id and tc.destino_id = s.destino_id
        limit 1),
  v as (select tv.* from tarifas_venta tv, s
        where tv.activo and tv.cliente_id = s.cliente_id and tv.tipo_unidad_id = s.tipo_unidad_id
          and tv.tipo_carga_id = s.tipo_carga_id and tv.origen_id = s.origen_id and tv.destino_id = s.destino_id
        limit 1)
  select (select costo_flete from c), (select costo_maniobras from c), (select costo_estadias from c), (select seguro from c),
         (select venta_flete from v), (select venta_maniobra from v), (select venta_estadias from v), (select seguro from v),
         exists(select 1 from c), exists(select 1 from v);
$$;

-- Al asignar transporte, crea/actualiza costos y venta con las tarifas encontradas (sin pisar capturas manuales > 0)
create or replace function public.servicios_costos() returns trigger
language plpgsql security definer set search_path = public as $$
declare t record;
begin
  if new.proveedor_id is null then return null; end if;
  select * into t from tarifas_para_servicio(new.id);
  insert into costos_venta (servicio_id, costo_flete, costo_maniobra, costo_estadias, costo_seguro,
                            venta_flete, venta_maniobra, venta_estadias, venta_seguro)
  values (new.id, coalesce(t.costo_flete,0), coalesce(t.costo_maniobra,0), coalesce(t.costo_estadias,0), coalesce(t.costo_seguro,0),
          coalesce(t.venta_flete,0), coalesce(t.venta_maniobra,0), coalesce(t.venta_estadias,0), coalesce(t.venta_seguro,0))
  on conflict (servicio_id) do nothing;
  return null;
end $$;

drop trigger if exists servicios_costos_trg on public.servicios;
create trigger servicios_costos_trg after insert or update of proveedor_id, tipo_unidad_id, tipo_carga_id, origen_id, destino_id, cliente_id
  on public.servicios for each row execute function public.servicios_costos();

-- ───────────── Vista plana (equivale a "Concentrado") ─────────────
create or replace view public.v_servicios with (security_invoker = true) as
select s.*,
  c.nombre as cliente, c.contacto_nombre as cliente_contacto, c.contacto_telefono as cliente_telefono,
  tu.nombre as tipo_unidad, tc.nombre as tipo_carga,
  po.nombre as origen, pd.nombre as destino,
  cc.nombre as cliente_carga, cc.domicilio as carga_domicilio, cc.colonia as carga_colonia, cc.codigo_postal as carga_cp, cc.link_ubicacion as carga_ubicacion,
  cd.nombre as cliente_descarga, cd.domicilio as descarga_domicilio, cd.colonia as descarga_colonia, cd.codigo_postal as descarga_cp, cd.link_ubicacion as descarga_ubicacion,
  pr.nombre as proveedor, pr.contacto_nombre as proveedor_contacto, pr.contacto_telefono as proveedor_telefono,
  op.nombre as operador, op.telefono as operador_telefono,
  cv.costo_flete, cv.venta_flete, cv.costo_maniobra, cv.venta_maniobra, cv.costo_estadias, cv.venta_estadias,
  cv.costo_seguro, cv.venta_seguro, cv.total_costo, cv.total_venta, cv.utilidad,
  case when coalesce(cv.total_venta,0) > 0 then round(cv.utilidad / cv.total_venta * 100, 1) end as margen_pct,
  cv.estatus_pago, cv.estatus_facturacion, cv.factura_kayard, cv.factura_proveedor, cv.enviado_facturar_at,
  extract(year from coalesce(s.fecha_carga, s.fecha))::int as anio,
  extract(month from coalesce(s.fecha_carga, s.fecha))::int as mes,
  extract(week from coalesce(s.fecha_carga, s.fecha))::int as semana
from servicios s
join clientes c on c.id = s.cliente_id
left join tipos_unidad tu on tu.id = s.tipo_unidad_id
left join tipos_carga tc on tc.id = s.tipo_carga_id
left join poblaciones po on po.id = s.origen_id
left join poblaciones pd on pd.id = s.destino_id
left join clientes_cd cc on cc.id = s.cliente_carga_id
left join clientes_cd cd on cd.id = s.cliente_descarga_id
left join proveedores pr on pr.id = s.proveedor_id
left join operadores op on op.id = s.operador_id
left join costos_venta cv on cv.servicio_id = s.id;

-- ───────────── Acceso del operador por link (sin login) ─────────────
create or replace function public.operador_servicio(p_token uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id_track', v.id_track, 'estatus', v.estatus, 'cliente', v.cliente,
    'tipo_unidad', v.tipo_unidad, 'tipo_carga', v.tipo_carga, 'origen', v.origen, 'destino', v.destino,
    'fecha_carga', v.fecha_carga, 'cita_carga', v.cita_carga, 'fecha_descarga', v.fecha_descarga, 'cita_descarga', v.cita_descarga,
    'cliente_carga', v.cliente_carga, 'carga_domicilio', v.carga_domicilio, 'carga_colonia', v.carga_colonia, 'carga_cp', v.carga_cp, 'carga_ubicacion', v.carga_ubicacion,
    'cliente_descarga', v.cliente_descarga, 'descarga_domicilio', v.descarga_domicilio, 'descarga_colonia', v.descarga_colonia, 'descarga_cp', v.descarga_cp, 'descarga_ubicacion', v.descarga_ubicacion,
    'req_fumigacion', v.req_fumigacion, 'req_gps', v.req_gps, 'req_cuenta_espejo', v.req_cuenta_espejo, 'req_poliza_seguro', v.req_poliza_seguro, 'req_sua', v.req_sua,
    'comentarios', v.comentarios, 'proveedor', v.proveedor, 'operador', v.operador, 'operador_telefono', v.operador_telefono,
    'placas_unidad', v.placas_unidad, 'economico_unidad', v.economico_unidad, 'placas_caja', v.placas_caja, 'economico_caja', v.economico_caja,
    'folio_licencia', v.folio_licencia,
    'evidencias', coalesce((select json_agg(json_build_object('path', e.foto_path, 'fecha', e.created_at) order by e.created_at)
                            from evidencias e where e.servicio_id = v.id), '[]'::json)
  )
  from (select s.*, c.nombre cliente, tu.nombre tipo_unidad, tc.nombre tipo_carga, po.nombre origen, pd.nombre destino,
               cc.nombre cliente_carga, cc.domicilio carga_domicilio, cc.colonia carga_colonia, cc.codigo_postal carga_cp, cc.link_ubicacion carga_ubicacion,
               cd.nombre cliente_descarga, cd.domicilio descarga_domicilio, cd.colonia descarga_colonia, cd.codigo_postal descarga_cp, cd.link_ubicacion descarga_ubicacion,
               pr.nombre proveedor, op.nombre operador, op.telefono operador_telefono
        from servicios s join clientes c on c.id = s.cliente_id
        left join tipos_unidad tu on tu.id = s.tipo_unidad_id left join tipos_carga tc on tc.id = s.tipo_carga_id
        left join poblaciones po on po.id = s.origen_id left join poblaciones pd on pd.id = s.destino_id
        left join clientes_cd cc on cc.id = s.cliente_carga_id left join clientes_cd cd on cd.id = s.cliente_descarga_id
        left join proveedores pr on pr.id = s.proveedor_id left join operadores op on op.id = s.operador_id
        where s.token_operador = p_token) v;
$$;

create or replace function public.operador_actualizar(p_token uuid, p_estatus text, p_lat double precision, p_lng double precision)
returns text language plpgsql security definer set search_path = public as $$
declare v_estatus text;
begin
  if p_estatus not in ('en_carga','en_transito','en_descarga','finalizado') then
    raise exception 'Estatus no permitido';
  end if;
  update servicios set estatus = p_estatus, ultima_lat = coalesce(p_lat, ultima_lat), ultima_lng = coalesce(p_lng, ultima_lng)
  where token_operador = p_token and estatus not in ('cancelado','finalizado','programado')
  returning estatus into v_estatus;
  if v_estatus is null then raise exception 'Servicio no disponible'; end if;
  return v_estatus;
end $$;

create or replace function public.operador_evidencia(p_token uuid, p_path text)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from servicios where token_operador = p_token and estatus <> 'cancelado';
  if v_id is null then raise exception 'Servicio no disponible'; end if;
  if split_part(p_path, '/', 1) <> p_token::text then raise exception 'Ruta inválida'; end if;
  insert into evidencias (servicio_id, foto_path) values (v_id, p_path);
end $$;

revoke all on function public.operador_servicio(uuid) from public;
revoke all on function public.operador_actualizar(uuid, text, double precision, double precision) from public;
revoke all on function public.operador_evidencia(uuid, text) from public;
grant execute on function public.operador_servicio(uuid) to anon, authenticated;
grant execute on function public.operador_actualizar(uuid, text, double precision, double precision) to anon, authenticated;
grant execute on function public.operador_evidencia(uuid, text) to anon, authenticated;

-- ───────────── RLS: usuarios autenticados y activos ─────────────
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_active);
$$;

do $$
declare t text;
begin
  foreach t in array array['tipos_unidad','tipos_carga','poblaciones','clientes','clientes_cd','proveedores','operadores',
                           'tarifas_compra','tarifas_venta','servicios','servicio_estatus','evidencias','costos_venta'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists staff_all on public.%I', t);
    execute format('create policy staff_all on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_staff());
drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ───────────── Storage: evidencias ─────────────
insert into storage.buckets (id, name, public) values ('evidencias', 'evidencias', true)
on conflict (id) do nothing;

create or replace function public.token_operador_valido(p_token text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from servicios where token_operador::text = p_token and estatus <> 'cancelado');
$$;
grant execute on function public.token_operador_valido(text) to anon, authenticated;

drop policy if exists evidencias_insert_operador on storage.objects;
create policy evidencias_insert_operador on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'evidencias' and public.token_operador_valido((storage.foldername(name))[1]));

drop policy if exists evidencias_staff on storage.objects;
create policy evidencias_staff on storage.objects for all to authenticated
  using (bucket_id = 'evidencias' and public.is_staff())
  with check (bucket_id = 'evidencias' and public.is_staff());

-- ───────────── Datos iniciales ─────────────
insert into public.tipos_unidad (nombre) values ('Trailer'), ('1.5 tons'), ('3.5 tons'), ('Rabón'), ('Torton'), ('Full')
on conflict do nothing;
insert into public.tipos_carga (nombre) values ('General'), ('Paletizada'), ('Granel'), ('Alimentos')
on conflict do nothing;

-- Los usuarios que ya existan quedan como administradores
insert into public.profiles (id, full_name, email, role)
select id, coalesce(raw_user_meta_data->>'full_name', split_part(email,'@',1)), email, 'admin' from auth.users
on conflict (id) do update set role = 'admin';

-- Las funciones de trigger no deben poder llamarse por la API
revoke execute on function public.handle_new_user(), public.servicios_bitacora(), public.servicios_bitacora_ins(), public.servicios_costos() from public, anon, authenticated;
revoke execute on function public.is_admin(), public.is_staff() from public, anon;
grant execute on function public.is_admin(), public.is_staff() to authenticated;

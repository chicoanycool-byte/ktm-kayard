-- ───────────── Cotizador (parámetros + cotizaciones con folio COT-AAAA-0001) ─────────────

-- Parámetros del cotizador (una sola fila, JSON editable desde la app)
create table if not exists public.cotizador_config (
  id int primary key default 1 check (id = 1),
  datos jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.cotizador_config (id, datos) values (1, '{}'::jsonb) on conflict (id) do nothing;

-- Cotizaciones
create table if not exists public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  fecha date not null default (now() at time zone 'America/Mexico_City')::date,
  vigencia_dias int not null default 15,
  cliente_id uuid references public.clientes(id),
  cliente_nombre text not null,
  contacto text,
  origen_id uuid references public.poblaciones(id),
  destino_id uuid references public.poblaciones(id),
  origen text not null,
  destino text not null,
  tipo_viaje text not null check (tipo_viaje in ('Local','Regional','Foraneo')),
  unidad text not null,              -- clave de unidad del cotizador (trailer, full, torton, camioneta_3_5, camioneta_1_5)
  unidad_descripcion text,           -- cómo aparece en la carta ("Trailer caja seca 53 pies")
  tarimas text,
  km numeric(10,2) not null default 0,
  retorno_vacio boolean not null default true,
  casetas numeric(12,2) not null default 0,
  personas int not null default 1,
  precio_combustible numeric(10,3),
  combustible_fuente text,
  desglose jsonb not null default '{}'::jsonb,   -- combustible, operador, mantenimiento, viaticos, fijos, casetas, dias
  costo_operativo numeric(12,2) not null default 0,
  margen_proveedor numeric(6,4) not null default 0.7,
  tarifa_proveedor numeric(12,2) not null default 0,
  margen_empresa numeric(6,4) not null default 0.9,
  tarifa_cliente numeric(12,2) not null default 0,
  hora_extra numeric(12,2) not null default 0,
  estadia numeric(12,2) not null default 0,
  comparativo jsonb,                 -- lo que se ha pagado / vendido en KTM en esa ruta
  condiciones text[] not null default '{}',
  notas text,
  estatus text not null default 'enviada' check (estatus in ('borrador','enviada','aceptada','rechazada')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists cotizaciones_fecha_idx on public.cotizaciones (fecha desc);

-- Folio consecutivo por año: COT-2026-0001
create table if not exists public.cotizaciones_folio (anio int primary key, ultimo int not null default 0);

create or replace function public.cotizaciones_asignar_folio() returns trigger
language plpgsql security definer set search_path = public as $$
declare a int := extract(year from coalesce(new.fecha, current_date))::int; n int;
begin
  if new.folio is not null then return new; end if;
  insert into cotizaciones_folio (anio, ultimo) values (a, 1)
    on conflict (anio) do update set ultimo = cotizaciones_folio.ultimo + 1
    returning ultimo into n;
  new.folio := 'COT-' || a || '-' || lpad(n::text, 4, '0');
  return new;
end $$;

drop trigger if exists cotizaciones_folio_trg on public.cotizaciones;
create trigger cotizaciones_folio_trg before insert on public.cotizaciones
  for each row execute function public.cotizaciones_asignar_folio();

-- Seguridad: solo personal (staff)
alter table public.cotizador_config enable row level security;
alter table public.cotizaciones enable row level security;
alter table public.cotizaciones_folio enable row level security;
drop policy if exists staff_all on public.cotizador_config;
create policy staff_all on public.cotizador_config for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists staff_all on public.cotizaciones;
create policy staff_all on public.cotizaciones for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists staff_all on public.cotizaciones_folio;
create policy staff_all on public.cotizaciones_folio for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Comparativo con datos reales de KTM: tarifas de compra/venta y servicios finalizados en la misma ruta
create or replace function public.cotizador_comparativo(p_origen uuid, p_destino uuid, p_unidades text[], p_cliente uuid default null)
returns jsonb language sql stable security invoker as $$
  with tu as (
    select id from tipos_unidad where lower(nombre) = any (select lower(unnest(p_unidades)))
  ),
  compra as (
    select pr.nombre as proveedor, tc.costo_flete, tc.created_at
    from tarifas_compra tc join proveedores pr on pr.id = tc.proveedor_id
    where tc.activo and tc.origen_id = p_origen and tc.destino_id = p_destino and tc.tipo_unidad_id in (select id from tu)
  ),
  venta as (
    select c.nombre as cliente, tv.venta_flete, tv.created_at
    from tarifas_venta tv join clientes c on c.id = tv.cliente_id
    where tv.activo and tv.origen_id = p_origen and tv.destino_id = p_destino and tv.tipo_unidad_id in (select id from tu)
      and (p_cliente is null or tv.cliente_id = p_cliente)
  ),
  serv as (
    select id_track, proveedor, cliente, costo_flete, venta_flete, coalesce(fecha_carga, fecha) as fecha
    from v_servicios
    where estatus = 'finalizado' and origen_id = p_origen and destino_id = p_destino and tipo_unidad_id in (select id from tu)
      and coalesce(costo_flete, 0) > 0
  )
  select jsonb_build_object(
    'tarifas_compra', (select coalesce(jsonb_agg(jsonb_build_object('proveedor', proveedor, 'costo', costo_flete) order by costo_flete), '[]'::jsonb) from compra),
    'tarifas_venta', (select coalesce(jsonb_agg(jsonb_build_object('cliente', cliente, 'venta', venta_flete) order by venta_flete), '[]'::jsonb) from venta),
    'servicios', jsonb_build_object(
      'n', (select count(*) from serv),
      'costo_min', (select min(costo_flete) from serv), 'costo_prom', (select round(avg(costo_flete), 2) from serv), 'costo_max', (select max(costo_flete) from serv),
      'venta_prom', (select round(avg(venta_flete), 2) from serv where coalesce(venta_flete,0) > 0),
      'ultimo', (select jsonb_build_object('id_track', id_track, 'proveedor', proveedor, 'costo', costo_flete, 'venta', venta_flete, 'fecha', fecha) from serv order by fecha desc nulls last limit 1)
    )
  );
$$;

-- Coordenadas y punto equivalente de la SICT para cada población (se llenan solas al cotizar)
alter table public.poblaciones
  add column if not exists lat numeric(9,6),
  add column if not exists lon numeric(9,6),
  add column if not exists sict_estado int,
  add column if not exists sict_id text,
  add column if not exists sict_nombre text;

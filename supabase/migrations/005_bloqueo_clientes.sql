-- Bloqueo de clientes por cartera vencida. Solo Administrador y Facturación.
alter table public.clientes
  add column if not exists bloqueado boolean not null default false,
  add column if not exists bloqueo_motivo text,
  add column if not exists bloqueado_at timestamptz,
  add column if not exists bloqueado_por uuid;

create or replace function public.puede_bloquear_clientes()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and is_active and role in ('admin', 'facturacion')
  );
$$;

-- El bloqueo solo se mueve con el rol correcto, aunque la llamada venga por fuera de la app.
create or replace function public.trg_bloqueo_clientes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.bloqueado is distinct from old.bloqueado
     or new.bloqueo_motivo is distinct from old.bloqueo_motivo then
    if not public.puede_bloquear_clientes() then
      raise exception 'Solo Administración y Finanzas pueden bloquear o liberar clientes';
    end if;
    if new.bloqueado then
      new.bloqueado_at := now();
      new.bloqueado_por := auth.uid();
    else
      new.bloqueado_at := null;
      new.bloqueado_por := null;
      new.bloqueo_motivo := null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists clientes_bloqueo on public.clientes;
create trigger clientes_bloqueo before update on public.clientes
for each row execute function public.trg_bloqueo_clientes();

-- Un cliente bloqueado no recibe servicios nuevos; los que ya traía siguen su curso.
create or replace function public.trg_servicio_cliente_bloqueado()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nombre text; v_motivo text;
begin
  select nombre, bloqueo_motivo into v_nombre, v_motivo
  from clientes where id = new.cliente_id and bloqueado;
  if found then
    raise exception 'El cliente % está bloqueado (%). Finanzas tiene que liberarlo antes de programar servicios.',
      v_nombre, coalesce(nullif(v_motivo, ''), 'cartera vencida');
  end if;
  return new;
end $$;

drop trigger if exists servicios_cliente_bloqueado on public.servicios;
create trigger servicios_cliente_bloqueado before insert on public.servicios
for each row execute function public.trg_servicio_cliente_bloqueado();

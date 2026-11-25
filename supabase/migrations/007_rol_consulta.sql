-- Rol de consulta: ve todo y no modifica nada. El candado va aquí, no en los botones.
create or replace function public.es_solo_lectura()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'consulta');
$$;

do $$
declare t text;
begin
  foreach t in array array['clientes','clientes_cd','costos_venta','cotizaciones','cotizaciones_folio',
                           'cotizador_config','operadores','poblaciones','proveedores','servicios',
                           'tarifas_compra','tarifas_venta','tipos_carga','tipos_unidad']
  loop
    execute format('drop policy if exists staff_all on public.%I', t);
    execute format('drop policy if exists staff_leer on public.%I', t);
    execute format('drop policy if exists staff_escribir on public.%I', t);
    execute format('create policy staff_leer on public.%I for select using (is_staff())', t);
    execute format('create policy staff_escribir on public.%I for all to authenticated
                      using (is_staff() and not es_solo_lectura())
                      with check (is_staff() and not es_solo_lectura())', t);
  end loop;
end $$;

drop policy if exists bitacora_insertar on public.servicio_estatus;
create policy bitacora_insertar on public.servicio_estatus for insert to authenticated
  with check (is_staff() and not es_solo_lectura());

drop policy if exists evidencias_insertar on public.evidencias;
create policy evidencias_insertar on public.evidencias for insert to authenticated
  with check (is_staff() and not es_solo_lectura());

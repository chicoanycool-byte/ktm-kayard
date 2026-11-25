-- Alta de usuarios y cambio de contraseña desde la app, con la sesión del propio
-- administrador, sin depender de la llave de servicio de Supabase.
-- Van como SECURITY DEFINER y lo primero que hacen es comprobar que quien llama
-- sea administrador activo.

create or replace function public.admin_crear_usuario(p_email text, p_password text, p_nombre text, p_rol text)
returns json language plpgsql security definer set search_path = public, extensions, auth as $$
declare v_id uuid := gen_random_uuid(); v_email text := lower(trim(p_email));
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_active and role = 'admin') then
    raise exception 'Solo un administrador puede dar de alta usuarios';
  end if;
  if p_rol not in ('admin','direccion','operaciones','compras','ventas','facturacion','monitoreo','consulta') then
    raise exception 'Rol inválido';
  end if;
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'La contraseña debe tener al menos 8 caracteres';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'El correo no tiene un formato válido';
  end if;
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Ya existe un usuario con ese correo';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
    is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', nullif(trim(p_nombre), ''), 'role', p_rol, 'email_verified', true),
    now(), now(), '', '', '', '', '', false, false
  );

  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (v_email, v_id,
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
          'email', now(), now());

  return json_build_object('id', v_id, 'email', v_email);
end $$;

create or replace function public.admin_cambiar_password(p_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_active and role = 'admin') then
    raise exception 'Solo un administrador puede cambiar contraseñas';
  end if;
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'La contraseña debe tener al menos 8 caracteres';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
   where id = p_id;
  if not found then raise exception 'No se encontró el usuario'; end if;
end $$;

revoke execute on function public.admin_crear_usuario(text, text, text, text) from public, anon;
revoke execute on function public.admin_cambiar_password(uuid, text) from public, anon;
grant execute on function public.admin_crear_usuario(text, text, text, text) to authenticated;
grant execute on function public.admin_cambiar_password(uuid, text) to authenticated;

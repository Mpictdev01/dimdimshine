-- Run once in the Supabase SQL Editor for the existing DIMDIM SHINE project.
-- Replaces only the login function. It does not update users, PIN hashes, shifts,
-- transactions, or transaction items.
create or replace function public.pos_login(
  p_user_id uuid, p_pin text, p_ip_hash text, p_token_hash text
) returns table(user_id uuid, full_name text, role text, must_change_pin boolean, expires_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
declare v_user public.users%rowtype;
declare v_expiry timestamptz;
begin
  if p_pin !~ '^[0-9]{4,8}$' or length(p_ip_hash) <> 64 or length(p_token_hash) <> 64 then
    return;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 1));
  select * into v_user from public.users u where u.id = p_user_id for update;
  if not found or not v_user.is_active then return; end if;
  if (select count(*) from public.pos_login_failures f
      where f.user_id = p_user_id and f.created_at > now() - interval '15 minutes') >= 5
     or (select count(*) from public.pos_login_failures f
      where f.ip_hash = p_ip_hash and f.created_at > now() - interval '15 minutes') >= 20 then
    return;
  end if;
  if v_user.pin_hash is null or extensions.crypt(p_pin, v_user.pin_hash) <> v_user.pin_hash
     or (v_user.legacy_pin_expires_at is not null and v_user.legacy_pin_expires_at < now()) then
    insert into public.pos_login_failures(user_id, ip_hash) values (p_user_id, p_ip_hash);
    return;
  end if;
  delete from public.pos_login_failures f where f.user_id = p_user_id;
  v_expiry := now() + case when v_user.role = 'cashier' then interval '12 hours' else interval '8 hours' end;
  insert into public.pos_sessions(token_hash, user_id, expires_at) values (p_token_hash, p_user_id, v_expiry);
  return query select v_user.id, v_user.full_name::text, v_user.role::text, v_user.must_change_pin, v_expiry;
end $$;

revoke all on function public.pos_login(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.pos_login(uuid,text,text,text) to service_role;

-- Tighten admin OTP issuance, single-use verification, and Supabase session binding.
-- These privileged functions are callable by the server service_role only.

create or replace function public.admin_store_otp_challenge(
  p_challenge_id uuid,
  p_user_id uuid,
  p_code_hash text,
  p_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_challenge_id is null
     or p_user_id is null
     or p_code_hash !~ '^[0-9a-f]{64}$'
     or p_expires_at <= statement_timestamp()
     or p_expires_at > statement_timestamp() + interval '10 minutes' then
    raise exception 'Invalid admin OTP challenge parameters';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  update public.admin_otp_challenges
  set consumed_at = statement_timestamp()
  where user_id = p_user_id
    and consumed_at is null;

  insert into public.admin_otp_challenges (
    id, user_id, code_hash, attempts, expires_at
  ) values (
    p_challenge_id, p_user_id, p_code_hash, 0, p_expires_at
  );
end;
$$;

create or replace function public.admin_consume_otp_challenge(
  p_challenge_id uuid,
  p_user_id uuid,
  p_code_hash text,
  p_auth_session_id uuid,
  p_auth_session_hash text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_valid boolean;
  v_session_row_id uuid;
begin
  if p_challenge_id is null
     or p_user_id is null
     or p_auth_session_id is null
     or p_code_hash !~ '^[0-9a-f]{64}$'
     or p_auth_session_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  if not exists (
    select 1
    from auth.sessions s
    where s.id = p_auth_session_id
      and s.user_id = p_user_id
  ) then
    return false;
  end if;

  update public.admin_otp_challenges c
  set attempts = c.attempts + 1,
      consumed_at = case
        when c.code_hash = p_code_hash or c.attempts >= 4
          then statement_timestamp()
        else null
      end
  where c.id = p_challenge_id
    and c.user_id = p_user_id
    and c.consumed_at is null
    and c.expires_at > statement_timestamp()
    and c.attempts < 5
  returning (c.code_hash = p_code_hash) into v_valid;

  if not found or v_valid is distinct from true then
    return false;
  end if;

  insert into public.admin_otp_sessions (
    user_id, auth_session_hash, expires_at, revoked_at
  ) values (
    p_user_id, p_auth_session_hash, statement_timestamp() + interval '12 hours', null
  )
  on conflict (auth_session_hash) do update
  set user_id = excluded.user_id,
      expires_at = excluded.expires_at,
      created_at = statement_timestamp(),
      revoked_at = null
  where public.admin_otp_sessions.user_id = excluded.user_id
  returning id into v_session_row_id;

  return v_session_row_id is not null;
end;
$$;

create or replace function public.admin_is_session_authorized(
  p_user_id uuid,
  p_auth_session_id uuid,
  p_auth_session_hash text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    exists (
      select 1
      from auth.sessions s
      where s.id = p_auth_session_id
        and s.user_id = p_user_id
    )
    and exists (
      select 1
      from public.admin_otp_sessions o
      where o.user_id = p_user_id
        and o.auth_session_hash = p_auth_session_hash
        and o.revoked_at is null
        and o.expires_at > statement_timestamp()
    );
$$;

revoke all on function public.admin_store_otp_challenge(uuid, uuid, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.admin_consume_otp_challenge(uuid, uuid, text, uuid, text)
  from public, anon, authenticated;
revoke all on function public.admin_is_session_authorized(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.admin_store_otp_challenge(uuid, uuid, text, timestamptz)
  to service_role;
grant execute on function public.admin_consume_otp_challenge(uuid, uuid, text, uuid, text)
  to service_role;
grant execute on function public.admin_is_session_authorized(uuid, uuid, text)
  to service_role;

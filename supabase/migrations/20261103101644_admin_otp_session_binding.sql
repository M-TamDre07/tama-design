alter table public.admin_otp_sessions
  rename column access_token_hash to auth_session_hash;

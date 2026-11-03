-- Restrict direct execution of the internal order event trigger function.
revoke execute on function public.capture_order_event() from public, anon, authenticated;

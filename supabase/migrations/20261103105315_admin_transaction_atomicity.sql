-- Record a transaction and synchronize its order/receipt in one database transaction.
create or replace function public.admin_record_transaction(
  p_order_code text,
  p_transaction_type text,
  p_amount numeric,
  p_status text,
  p_method text,
  p_reference text,
  p_note text,
  p_actor_id uuid,
  p_actor_email text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_order public.orders%rowtype;
  v_transaction public.transactions%rowtype;
  v_payment_status text := null;
  v_receipt_count integer := 0;
begin
  if p_order_code !~ '^ORD-[A-Z0-9-]{4,36}$'
     or p_amount is null or p_amount <= 0 or p_amount > 1000000000
     or p_transaction_type not in ('Pembayaran','DP','Pelunasan','Refund','Penyesuaian')
     or p_status not in ('Menunggu','Berhasil','Gagal','Refund','Dibatalkan') then
    raise exception using errcode='22023', message='Invalid transaction data';
  end if;
  select * into v_order from public.orders
    where order_code=p_order_code and archived_at is null for update;
  if not found then
    raise exception using errcode='P0002', message='Order not found';
  end if;
  insert into public.transactions(order_id,customer_id,transaction_type,amount,status,method,reference,note)
  values(v_order.id,v_order.customer_id,p_transaction_type,p_amount,p_status,coalesce(p_method,''),coalesce(p_reference,''),coalesce(p_note,''))
  returning * into v_transaction;
  if p_status='Berhasil' and p_transaction_type in ('Pembayaran','Pelunasan') then
    v_payment_status := 'Dibayar';
  elsif p_status='Refund' or (p_status='Berhasil' and p_transaction_type='Refund') then
    v_payment_status := 'Refund';
  end if;
  if v_payment_status is not null then
    update public.orders set payment_status=v_payment_status,
      payment_date=case when v_payment_status='Dibayar' then now() else null end,
      updated_at=now() where id=v_order.id;
    update public.receipts set payment_status=v_payment_status,
      method=coalesce(p_method,method),
      note=case when coalesce(p_note,'')<>'' then p_note else note end
    where order_id=v_order.id;
    get diagnostics v_receipt_count=row_count;
  end if;
  insert into public.order_events(order_id,event_type,note,is_internal,actor_id,actor_email,metadata)
  values(v_order.id,'TRANSACTION_RECORDED',
    p_transaction_type || ' · ' || p_status || ' · Rp' || to_char(p_amount,'FM999G999G999G990D00'),
    true,p_actor_id,coalesce(p_actor_email,''),
    jsonb_build_object('transaction_id',v_transaction.id,'amount',p_amount,'type',p_transaction_type,
      'status',p_status,'method',coalesce(p_method,''),'reference',coalesce(p_reference,'')));
  return jsonb_build_object('transaction',to_jsonb(v_transaction),
    'paymentStatus',v_payment_status,'receiptUpdated',v_receipt_count>0);
end;
$$;
revoke all on function public.admin_record_transaction(text,text,numeric,text,text,text,text,uuid,text)
  from public, anon, authenticated;
grant execute on function public.admin_record_transaction(text,text,numeric,text,text,text,text,uuid,text)
  to service_role;

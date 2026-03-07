-- SMS hardening and safer service-role policies

-- Restrict "service role" tables to service role only.
drop policy if exists "Service role manages numbers" on numbers;
create policy "Service role manages numbers"
  on numbers for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages webhooks" on webhooks;
create policy "Service role manages webhooks"
  on webhooks for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages credits_ledger" on credits_ledger;
create policy "Service role manages credits_ledger"
  on credits_ledger for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages credits_balance" on credits_balance;
create policy "Service role manages credits_balance"
  on credits_balance for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage demo_calls" on demo_calls;
create policy "Service role can manage demo_calls"
  on demo_calls for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages sms_messages" on sms_messages;
create policy "Service role manages sms_messages"
  on sms_messages for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Performance and lookup hardening.
create index if not exists idx_numbers_phone_status
  on numbers(phone_number, status);

create index if not exists idx_sms_messages_number_twilio_sid
  on sms_messages(number_id, twilio_sid);

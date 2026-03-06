create table sms_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  number_id uuid not null references numbers(id) on delete cascade,
  direction text not null,
  customer_number text not null,
  body text not null,
  status text not null default 'queued',
  twilio_sid text,
  cost_cents integer default 0,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_sms_messages_org_id on sms_messages(org_id);
create index idx_sms_messages_number_id on sms_messages(number_id);
create index idx_sms_messages_twilio_sid on sms_messages(twilio_sid);

alter table sms_messages enable row level security;
create policy "Service role manages sms_messages"
  on sms_messages for all using (true) with check (true);

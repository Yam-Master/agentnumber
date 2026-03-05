-- AgentNumber Infrastructure API Migration
-- Adds organizations, API keys, numbers, webhooks, and credits system

-- ============================================================
-- Organizations
-- ============================================================

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index idx_organizations_owner_id on organizations(owner_id);

alter table organizations enable row level security;

-- ============================================================
-- Org Members (must be created before organizations RLS policy)
-- ============================================================

create table org_members (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index idx_org_members_user_id on org_members(user_id);

alter table org_members enable row level security;

create policy "Users can view own memberships"
  on org_members for select
  using (user_id = auth.uid());

-- Now safe to reference org_members
create policy "Users can view own orgs"
  on organizations for select
  using (owner_id = auth.uid() or id in (
    select org_id from org_members where user_id = auth.uid()
  ));

-- ============================================================
-- API Keys
-- ============================================================

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  permissions text[] not null default '{}',
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_api_keys_org_id on api_keys(org_id);
create unique index idx_api_keys_key_hash on api_keys(key_hash);

alter table api_keys enable row level security;

create policy "Users can view own org api keys"
  on api_keys for select
  using (org_id in (
    select org_id from org_members where user_id = auth.uid()
  ));

create policy "Users can create api keys for own org"
  on api_keys for insert
  with check (org_id in (
    select org_id from org_members where user_id = auth.uid()
  ));

create policy "Users can update own org api keys"
  on api_keys for update
  using (org_id in (
    select org_id from org_members where user_id = auth.uid()
  ));

-- ============================================================
-- Numbers
-- ============================================================

create table numbers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  phone_number text not null,
  system_prompt text,
  first_message text,
  voice_id text not null default 'cgSgspJ2msm6clMCkdW9',
  inbound_mode text not null default 'autopilot',
  webhook_url text,
  metadata jsonb default '{}',
  vapi_assistant_id text not null,
  vapi_phone_number_id text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index idx_numbers_org_id on numbers(org_id);

alter table numbers enable row level security;

create policy "Service role manages numbers"
  on numbers for all
  using (true)
  with check (true);

-- ============================================================
-- Webhooks
-- ============================================================

create table webhooks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  url text not null,
  events text[] not null default '{}',
  secret text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_webhooks_org_id on webhooks(org_id);

alter table webhooks enable row level security;

create policy "Service role manages webhooks"
  on webhooks for all
  using (true)
  with check (true);

-- ============================================================
-- Credits Ledger
-- ============================================================

create table credits_ledger (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  type text not null, -- 'deposit' or 'debit'
  amount_cents integer not null,
  description text,
  reference_id text,
  reference_type text,
  balance_after_cents integer not null,
  created_at timestamptz not null default now()
);

create index idx_credits_ledger_org_id on credits_ledger(org_id);

alter table credits_ledger enable row level security;

create policy "Service role manages credits_ledger"
  on credits_ledger for all
  using (true)
  with check (true);

-- ============================================================
-- Credits Balance
-- ============================================================

create table credits_balance (
  org_id uuid primary key references organizations(id) on delete cascade,
  balance_cents integer not null default 0
);

alter table credits_balance enable row level security;

create policy "Service role manages credits_balance"
  on credits_balance for all
  using (true)
  with check (true);

-- ============================================================
-- Base tables (agents, calls, demo_calls)
-- ============================================================

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  system_prompt text not null,
  first_message text,
  voice_id text default 'cgSgspJ2msm6clMCkdW9',
  vapi_assistant_id text not null,
  vapi_phone_number_id text,
  phone_number text,
  created_at timestamptz default now()
);

create index if not exists idx_agents_user_id on agents(user_id);
alter table agents enable row level security;

create policy "Users can view own agents"
  on agents for select
  using (auth.uid() = user_id);

create policy "Users can create own agents"
  on agents for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own agents"
  on agents for delete
  using (auth.uid() = user_id);

create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete cascade,
  vapi_call_id text not null,
  direction text not null,
  customer_number text,
  status text,
  duration integer,
  transcript text,
  summary text,
  recording_url text,
  ended_reason text,
  created_at timestamptz default now()
);

create index if not exists idx_calls_agent_id on calls(agent_id);
create index if not exists idx_calls_vapi_call_id on calls(vapi_call_id);
alter table calls enable row level security;

create policy "Users can view own calls"
  on calls for select
  using (
    agent_id in (
      select id from agents where user_id = auth.uid()
    )
  );

create policy "Users can create calls for own agents"
  on calls for insert
  with check (
    agent_id in (
      select id from agents where user_id = auth.uid()
    )
  );

create table if not exists demo_calls (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  personality text not null,
  created_at timestamptz default now()
);

create index if not exists idx_demo_calls_phone_created on demo_calls(phone_number, created_at);
alter table demo_calls enable row level security;

create policy "Service role can manage demo_calls"
  on demo_calls for all
  using (true)
  with check (true);

-- ============================================================
-- Add new columns to calls table
-- ============================================================

alter table calls add column if not exists org_id uuid references organizations(id) on delete set null;
alter table calls add column if not exists number_id uuid references numbers(id) on delete set null;
alter table calls add column if not exists metadata jsonb default '{}';
alter table calls add column if not exists cost_cents integer;

create index if not exists idx_calls_org_id on calls(org_id);
create index if not exists idx_calls_number_id on calls(number_id);

-- ============================================================
-- Postgres Functions: Credits
-- ============================================================

create or replace function deposit_credits(
  p_org_id uuid,
  p_amount_cents integer,
  p_description text default null
) returns integer as $$
declare
  v_new_balance integer;
begin
  -- Update balance
  update credits_balance
  set balance_cents = balance_cents + p_amount_cents
  where org_id = p_org_id
  returning balance_cents into v_new_balance;

  -- Insert ledger entry
  insert into credits_ledger (org_id, type, amount_cents, description, balance_after_cents)
  values (p_org_id, 'deposit', p_amount_cents, p_description, v_new_balance);

  return v_new_balance;
end;
$$ language plpgsql security definer;

create or replace function debit_credits(
  p_org_id uuid,
  p_amount_cents integer,
  p_description text default null,
  p_ref_id text default null,
  p_ref_type text default null
) returns boolean as $$
declare
  v_current_balance integer;
  v_new_balance integer;
begin
  -- Lock and check balance
  select balance_cents into v_current_balance
  from credits_balance
  where org_id = p_org_id
  for update;

  if v_current_balance is null or v_current_balance < p_amount_cents then
    return false;
  end if;

  v_new_balance := v_current_balance - p_amount_cents;

  -- Update balance
  update credits_balance
  set balance_cents = v_new_balance
  where org_id = p_org_id;

  -- Insert ledger entry
  insert into credits_ledger (org_id, type, amount_cents, description, reference_id, reference_type, balance_after_cents)
  values (p_org_id, 'debit', p_amount_cents, p_description, p_ref_id, p_ref_type, v_new_balance);

  return true;
end;
$$ language plpgsql security definer;

-- ============================================================
-- Trigger: Auto-create org on user signup
-- ============================================================

create or replace function handle_new_user() returns trigger as $$
declare
  v_org_id uuid;
begin
  -- Create organization
  insert into organizations (name, owner_id)
  values (coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.id)
  returning id into v_org_id;

  -- Add user as org owner
  insert into org_members (org_id, user_id, role)
  values (v_org_id, new.id, 'owner');

  -- Initialize credits balance
  insert into credits_balance (org_id, balance_cents)
  values (v_org_id, 0);

  return new;
end;
$$ language plpgsql security definer;

-- Create trigger (drop first if exists to make migration idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

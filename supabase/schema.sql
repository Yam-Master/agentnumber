-- AgentNumber database schema
-- Run this in your Supabase SQL editor

-- Agents table
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

-- Calls table
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

-- Demo calls table (for rate limiting)
create table if not exists demo_calls (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  personality text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table agents enable row level security;
alter table calls enable row level security;
alter table demo_calls enable row level security;

-- RLS policies for agents
create policy "Users can view own agents"
  on agents for select
  using (auth.uid() = user_id);

create policy "Users can create own agents"
  on agents for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own agents"
  on agents for delete
  using (auth.uid() = user_id);

-- RLS policies for calls
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
      select id from agents where user_id = auth_uid()
    )
  );

-- Demo calls: allow insert from service role only (no RLS needed for anon)
create policy "Service role can manage demo_calls"
  on demo_calls for all
  using (true)
  with check (true);

-- Indexes
create index if not exists idx_agents_user_id on agents(user_id);
create index if not exists idx_calls_agent_id on calls(agent_id);
create index if not exists idx_calls_vapi_call_id on calls(vapi_call_id);
create index if not exists idx_demo_calls_phone_created on demo_calls(phone_number, created_at);

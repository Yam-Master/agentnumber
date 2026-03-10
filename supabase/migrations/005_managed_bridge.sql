-- Managed OpenClaw bridge configuration per organization

create table if not exists managed_bridge_connections (
  org_id uuid primary key references organizations(id) on delete cascade,
  gateway_url text not null,
  gateway_token text not null,
  agent_id text not null default 'main',
  enabled boolean not null default true,
  sms_autoreply boolean not null default false,
  voice_rules text,
  sms_rules text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_managed_bridge_connections_enabled
  on managed_bridge_connections(enabled);

alter table managed_bridge_connections enable row level security;

drop policy if exists "Service role manages managed_bridge_connections" on managed_bridge_connections;
create policy "Service role manages managed_bridge_connections"
  on managed_bridge_connections for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

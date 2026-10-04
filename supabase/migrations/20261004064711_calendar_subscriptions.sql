create table public.family_calendar_connections (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 household_id uuid not null references public.family_households(id) on delete cascade,
 provider text not null check(provider in ('google','apple')),
 label text not null check(length(label) between 1 and 60),
 feed_url text not null check(length(feed_url) between 10 and 2000),
 created_at timestamptz not null default now(),
 unique(id,owner_id,household_id),
 unique(owner_id,feed_url)
);
create index family_calendar_connections_household_idx on public.family_calendar_connections(household_id);
create table public.family_calendar_snapshots (
 connection_id uuid primary key,
 owner_id uuid not null,
 household_id uuid not null,
 provider text not null check(provider in ('google','apple')),
 label text not null check(length(label) between 1 and 60),
 events jsonb not null default '[]' check(jsonb_typeof(events)='array' and octet_length(events::text)<2000000),
 synced_at timestamptz not null,
 range_start date not null,
 range_end date not null,
 foreign key(connection_id,owner_id,household_id) references public.family_calendar_connections(id,owner_id,household_id) on delete cascade
);
create index family_calendar_snapshots_household_idx on public.family_calendar_snapshots(household_id);
alter table public.family_calendar_connections enable row level security;
alter table public.family_calendar_snapshots enable row level security;
-- Calendar URLs are bearer secrets: only the source owner can read them.
create policy calendar_connections_read on public.family_calendar_connections for select to authenticated using(owner_id=(select auth.uid()) and household_id=(select family_private.current_household()));
create policy calendar_connections_insert on public.family_calendar_connections for insert to authenticated with check(owner_id=(select auth.uid()) and household_id=(select family_private.current_household()));
create policy calendar_connections_delete on public.family_calendar_connections for delete to authenticated using(owner_id=(select auth.uid()) and household_id=(select family_private.current_household()));
-- Connecting a calendar explicitly shares its snapshot with the current household.
create policy calendar_snapshots_read on public.family_calendar_snapshots for select to authenticated using(household_id=(select family_private.current_household()));
create policy calendar_snapshots_insert on public.family_calendar_snapshots for insert to authenticated with check(owner_id=(select auth.uid()) and household_id=(select family_private.current_household()));
create policy calendar_snapshots_update on public.family_calendar_snapshots for update to authenticated using(owner_id=(select auth.uid()) and household_id=(select family_private.current_household())) with check(owner_id=(select auth.uid()) and household_id=(select family_private.current_household()));
revoke all on public.family_calendar_connections,public.family_calendar_snapshots from anon,authenticated;
grant select,insert,delete on public.family_calendar_connections to authenticated;
grant select,insert,update on public.family_calendar_snapshots to authenticated;

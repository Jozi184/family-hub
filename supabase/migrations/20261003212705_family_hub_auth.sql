create schema if not exists family_private;
revoke all on schema family_private from public, anon;
grant usage on schema family_private to authenticated;

create table public.family_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 60),
 color text not null default '#416443' check(color in ('#416443','#4267ac','#b77727','#ba5757','#33827f'))
);
create table public.family_households (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 1 and 80),
 owner_id uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table public.family_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 household_id uuid not null references public.family_households(id) on delete cascade,
 joined_at timestamptz not null default now()
);
create index family_members_household_id_idx on public.family_members(household_id);
create index family_households_owner_id_idx on public.family_households(owner_id);
create table public.family_state (
 household_id uuid primary key references public.family_households(id) on delete cascade,
 data jsonb not null default '{"items":[],"plan":[],"presets":[],"events":[]}',
 revision bigint not null default 0,
 updated_at timestamptz not null default now(),
 check(jsonb_typeof(data)='object')
);
create table family_private.invites (
 household_id uuid primary key references public.family_households(id) on delete cascade,
 token_hash bytea not null unique,
 expires_at timestamptz not null,
 remaining integer not null default 4 check(remaining>=0)
);

alter table public.family_profiles enable row level security;
alter table public.family_households enable row level security;
alter table public.family_members enable row level security;
alter table public.family_state enable row level security;
alter table family_private.invites enable row level security;

create function family_private.current_household() returns uuid language sql stable security definer set search_path='' as $$
 select household_id from public.family_members where user_id=auth.uid()
$$;
revoke all on function family_private.current_household() from public,anon;
grant execute on function family_private.current_household() to authenticated;
create policy households_read on public.family_households for select to authenticated using (id=(select family_private.current_household()));
create policy members_read on public.family_members for select to authenticated using (household_id=(select family_private.current_household()));
create policy state_read on public.family_state for select to authenticated using (household_id=(select family_private.current_household()));
create policy profile_read on public.family_profiles for select to authenticated using (
 user_id=(select auth.uid()) or exists(select 1 from public.family_members m where m.user_id=family_profiles.user_id and m.household_id=(select family_private.current_household()))
);
create policy profile_insert on public.family_profiles for insert to authenticated with check(user_id=(select auth.uid()));
create policy profile_update on public.family_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
revoke all on public.family_households,public.family_members,public.family_state,public.family_profiles from anon,authenticated;
grant select on public.family_households,public.family_members,public.family_state,public.family_profiles to authenticated;
grant insert(user_id,name,color),update(name,color) on public.family_profiles to authenticated;

create function family_private.make_invite(h uuid) returns text language plpgsql security definer set search_path='' as $$
declare token text;
begin
 if auth.uid() is null or not exists(select 1 from public.family_households where id=h and owner_id=auth.uid()) then raise exception 'not_allowed';end if;
 token:=encode(extensions.gen_random_bytes(24),'hex');
 insert into family_private.invites(household_id,token_hash,expires_at,remaining) values(h,extensions.digest(token,'sha256'),now()+interval '7 days',4)
 on conflict(household_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,remaining=4;
 return token;
end $$;
create function public.family_new_invite() returns text language sql security invoker set search_path='' as $$select family_private.make_invite(family_private.current_household())$$;

create function family_private.create_household(household_name text) returns jsonb language plpgsql security definer set search_path='' as $$
declare h uuid;token text;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if exists(select 1 from public.family_members where user_id=auth.uid()) then raise exception 'already_member';end if;
 if length(trim(household_name)) not between 1 and 80 then raise exception 'invalid_name';end if;
 insert into public.family_households(name,owner_id) values(trim(household_name),auth.uid()) returning id into h;
 insert into public.family_members(user_id,household_id) values(auth.uid(),h);
 insert into public.family_state(household_id) values(h);
 token:=family_private.make_invite(h);
 return jsonb_build_object('household_id',h,'invite',token);
end $$;
create function public.family_create_household(household_name text) returns jsonb language sql security invoker set search_path='' as $$select family_private.create_household(household_name)$$;

create function family_private.join_household(invite_token text) returns uuid language plpgsql security definer set search_path='' as $$
declare h uuid;chosen text;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if exists(select 1 from public.family_members where user_id=auth.uid()) then raise exception 'already_member';end if;
 if length(invite_token)<>48 then raise exception 'invalid_invite';end if;
 select household_id into h from family_private.invites where token_hash=extensions.digest(invite_token,'sha256') and expires_at>now() and remaining>0 for update;
 if h is null then raise exception 'invalid_invite';end if;
 if (select count(*) from public.family_members where household_id=h)>=5 then raise exception 'household_full';end if;
 select palette.candidate into chosen from unnest(array['#4267ac','#416443','#b77727','#ba5757','#33827f']) as palette(candidate) where not exists(select 1 from public.family_profiles p join public.family_members m on m.user_id=p.user_id where m.household_id=h and p.color=palette.candidate) limit 1;
 if chosen is not null then update public.family_profiles set color=chosen where user_id=auth.uid();end if;
 insert into public.family_members(user_id,household_id) values(auth.uid(),h);
 update family_private.invites set remaining=remaining-1 where household_id=h;
 return h;
end $$;
create function public.family_join_household(invite_token text) returns uuid language sql security invoker set search_path='' as $$select family_private.join_household(invite_token)$$;

create function family_private.save_state(payload jsonb,expected_revision bigint) returns bigint language plpgsql security definer set search_path='' as $$
declare h uuid;rev bigint;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 h:=family_private.current_household();if h is null then raise exception 'no_household';end if;
 if octet_length(payload::text)>200000 or jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_typeof(payload->'plan') is distinct from 'array' or jsonb_typeof(payload->'presets') is distinct from 'array' or jsonb_typeof(payload->'events') is distinct from 'array' then raise exception 'invalid_data';end if;
 update public.family_state set data=payload,revision=revision+1,updated_at=now() where household_id=h and revision=expected_revision returning revision into rev;
 if rev is null then raise exception 'revision_conflict';end if;
 return rev;
end $$;
create function public.family_save_state(payload jsonb,expected_revision bigint) returns bigint language sql security invoker set search_path='' as $$select family_private.save_state(payload,expected_revision)$$;

revoke all on function family_private.make_invite(uuid),family_private.create_household(text),family_private.join_household(text),family_private.save_state(jsonb,bigint) from public,anon;
grant execute on function family_private.make_invite(uuid),family_private.create_household(text),family_private.join_household(text),family_private.save_state(jsonb,bigint) to authenticated;
revoke all on function public.family_new_invite(),public.family_create_household(text),public.family_join_household(text),public.family_save_state(jsonb,bigint) from public,anon;
grant execute on function public.family_new_invite(),public.family_create_household(text),public.family_join_household(text),public.family_save_state(jsonb,bigint) to authenticated;

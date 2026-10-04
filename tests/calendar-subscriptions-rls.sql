-- Run as database administrator. All fixture data is rolled back; no emails are sent.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','family-test-owner@example.invalid'),
 ('10000000-0000-4000-8000-000000000002','family-test-outsider@example.invalid'),
 ('10000000-0000-4000-8000-000000000003','family-test-partner@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.family_profiles(user_id,name) values(auth.uid(),'Owner');
select set_config('family_test.household',public.family_create_household('Test family')::text,true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into public.family_profiles(user_id,name) values(auth.uid(),'Outsider');
do $$begin
 if (select count(*) from public.family_state)<>0 then raise exception 'outsider_read_leak';end if;
 if (select count(*) from public.family_profiles)<>1 then raise exception 'profile_read_leak';end if;
 update public.family_profiles set name='intruder' where user_id='10000000-0000-4000-8000-000000000001';
 if found then raise exception 'profile_write_leak';end if;
 begin
  perform public.family_join_household(repeat('0',48));
  raise exception 'invalid_invite_accepted';
 exception when others then if sqlerrm<>'invalid_invite' then raise;end if;end;
 begin
  perform public.family_save_state('{"items":[],"plan":[],"presets":[],"events":[]}',0);
  raise exception 'non_member_saved';
 exception when others then if sqlerrm<>'no_household' then raise;end if;end;
 begin
  update public.family_state set revision=99;
  raise exception 'direct_write_allowed';
 exception when insufficient_privilege then null;end;
end $$;
select public.family_create_household('Other family');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
insert into public.family_profiles(user_id,name) values(auth.uid(),'Partner');
select public.family_join_household(current_setting('family_test.household')::jsonb->>'invite');
do $$begin
 if (select count(*) from public.family_members)<>2 then raise exception 'members_not_shared';end if;
 if (select count(*) from public.family_profiles)<>2 then raise exception 'member_profiles_not_shared';end if;
 if (select count(*) from public.family_state)<>1 then raise exception 'state_isolation_failed';end if;
 if public.family_save_state('{"items":[],"plan":[],"presets":[],"events":[]}',0)<>1 then raise exception 'save_failed';end if;
 begin
  perform public.family_save_state('{"items":[],"plan":[],"presets":[],"events":[]}',0);
  raise exception 'stale_write_accepted';
 exception when others then if sqlerrm<>'revision_conflict' then raise;end if;end;
 begin
  perform public.family_new_invite();
  raise exception 'non_owner_invitation_allowed';
 exception when others then if sqlerrm<>'not_allowed' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.family_calendar_connections(id,owner_id,household_id,provider,label,feed_url) values
 ('20000000-0000-4000-8000-000000000001',auth.uid(),family_private.current_household(),'google','Owner calendar','https://calendar.google.com/calendar/ical/test/private-test/basic.ics');
insert into public.family_calendar_snapshots(connection_id,owner_id,household_id,provider,label,events,synced_at,range_start,range_end)
 values('20000000-0000-4000-8000-000000000001',auth.uid(),family_private.current_household(),'google','Owner calendar','[]',now(),'2026-10-01','2027-10-01');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$begin
 if (select count(*) from public.family_calendar_connections)<>0 then raise exception 'partner_feed_secret_leak';end if;
 if (select count(*) from public.family_calendar_snapshots)<>1 then raise exception 'partner_cannot_read_snapshot';end if;
 delete from public.family_calendar_connections where id='20000000-0000-4000-8000-000000000001';
 if found then raise exception 'partner_deleted_owner_connection';end if;
 update public.family_calendar_snapshots set events='[{"title":"intruder"}]' where connection_id='20000000-0000-4000-8000-000000000001';
 if found then raise exception 'partner_modified_owner_snapshot';end if;
 begin
  insert into public.family_calendar_connections(owner_id,household_id,provider,label,feed_url)
  values('10000000-0000-4000-8000-000000000001',family_private.current_household(),'apple','Forged owner','https://p1-calendars.icloud.com/published/2/test');
  raise exception 'forged_owner_accepted';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$begin
 if (select count(*) from public.family_calendar_connections)<>0 then raise exception 'outsider_feed_secret_leak';end if;
 if (select count(*) from public.family_calendar_snapshots)<>0 then raise exception 'outsider_snapshot_leak';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$begin
 if (select count(*) from public.family_calendar_connections)<>1 then raise exception 'owner_cannot_read_feed';end if;
 delete from public.family_calendar_connections where id='20000000-0000-4000-8000-000000000001';
 if (select count(*) from public.family_calendar_snapshots)<>0 then raise exception 'disconnect_did_not_remove_snapshot';end if;
end $$;
set local role anon;
do $$begin
 begin
  perform public.family_create_household('Anonymous');
  raise exception 'anonymous_execution_allowed';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'Calendar URL privacy, household sharing, owner-only writes and disconnect cascade passed; fixtures rolled back' as result;

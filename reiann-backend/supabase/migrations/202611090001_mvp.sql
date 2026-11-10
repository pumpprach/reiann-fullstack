-- Reiann MVP. Run once in Supabase SQL Editor, or with `supabase db push`.
-- Authentication is handled by Supabase Auth; never put a service role key in Next.js.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  program_id text not null,
  campus_id text not null,
  study_year smallint not null check (study_year between 1 and 10),
  transcript_status text not null default 'pending'
    check (transcript_status in ('pending', 'skipped', 'confirmed')),
  transcript_issued date,
  updated_at timestamptz not null default now()
);

create table public.course_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null check (code ~ '^[0-9]{8}$'),
  term text not null check (term ~ '^[0-9]{4}/[123]$'),
  credits numeric(4,1) not null check (credits > 0 and credits <= 30),
  grade text check (grade in ('A','B+','B','C+','C','D+','D','F','P','S','U','W','I')),
  primary key (user_id, code, term)
);

create table public.calculators (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_code text not null check (course_code ~ '^[0-9]{8}$'),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_code)
);

create table public.class_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  term text not null check (term ~ '^[0-9]{4}/[123]$'),
  course_code text not null check (course_code ~ '^[0-9]{8}$'),
  day smallint not null check (day between 0 and 6),
  start_time time not null,
  end_time time not null,
  kind text not null check (kind in ('lecture', 'lab')),
  room text,
  section text,
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  check (start_time >= time '07:00' and end_time <= time '20:00')
);
create index class_slots_user_term_idx on public.class_slots(user_id, term);

create table public.next_term_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  codes text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique default (
    replace(gen_random_uuid()::text, '-', '') ||
    left(replace(gen_random_uuid()::text, '-', ''), 16)
  ),
  name text not null check (char_length(name) between 1 and 100),
  term text not null check (term ~ '^[0-9]{4}/[123]$'),
  expires_at timestamptz not null,
  show_course_names boolean not null default true,
  allow_compare boolean not null default false,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index share_links_user_idx on public.share_links(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.course_records enable row level security;
alter table public.calculators enable row level security;
alter table public.class_slots enable row level security;
alter table public.next_term_plans enable row level security;
alter table public.share_links enable row level security;

-- Each table is private. Only the owner can access its rows.
create policy profiles_owner on public.profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy records_owner on public.course_records for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy calculators_owner on public.calculators for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy slots_owner on public.class_slots for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy plans_owner on public.next_term_plans for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy shares_owner on public.share_links for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.profiles, public.course_records,
  public.calculators, public.class_slots, public.next_term_plans, public.share_links
  to authenticated;
revoke all on public.profiles, public.course_records, public.calculators,
  public.class_slots, public.next_term_plans, public.share_links from anon;

-- Replace all records in one transaction. Only confirmed course data is saved;
-- the uploaded PDF and identifying text never reach the database.
create or replace function public.replace_course_records(
  p_records jsonb, p_status text default null, p_issued date default null
) returns void language plpgsql security invoker set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if jsonb_typeof(p_records) <> 'array' or jsonb_array_length(p_records) > 300 then
    raise exception 'Invalid records';
  end if;
  if p_status is not null and p_status <> 'confirmed' then
    raise exception 'Invalid transcript status';
  end if;
  delete from public.course_records where user_id = v_user;
  insert into public.course_records (user_id, code, term, credits, grade)
  select v_user, x.code, x.term, x.credits, x.grade
  from jsonb_to_recordset(p_records) as x(code text, term text, credits numeric, grade text);
  if p_status = 'confirmed' then
    update public.profiles set transcript_status = 'confirmed',
      transcript_issued = p_issued, updated_at = now()
    where user_id = v_user;
    if not found then raise exception 'Profile required'; end if;
  end if;
end $$;
revoke all on function public.replace_course_records(jsonb,text,date) from public, anon;
grant execute on function public.replace_course_records(jsonb,text,date) to authenticated;

-- Anonymous viewers receive only schedule fields. No email, grades or Google name.
create or replace function public.get_shared_schedule(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_link public.share_links%rowtype;
begin
  if p_token !~ '^[0-9a-f]{48}$' then return null; end if;
  select * into v_link from public.share_links
  where token = p_token and revoked_at is null and expires_at > now();
  if not found then return null; end if;
  return jsonb_build_object(
    'ownerLabel', 'เพื่อน',
    'term', v_link.term,
    'expiresAt', v_link.expires_at,
    'updatedAt', coalesce((select max(s.updated_at) from public.class_slots s
      where s.user_id = v_link.user_id and s.term = v_link.term), v_link.created_at),
    'showCourseNames', v_link.show_course_names,
    'allowCompare', v_link.allow_compare,
    'slots', coalesce((select jsonb_agg(jsonb_build_object(
      'id', s.id, 'courseCode', case when v_link.show_course_names then s.course_code else '' end,
      'day', s.day, 'start', to_char(s.start_time, 'HH24:MI'),
      'end', to_char(s.end_time, 'HH24:MI'), 'kind', s.kind,
      'room', case when v_link.show_course_names then s.room else null end,
      'section', case when v_link.show_course_names then s.section else null end
    ) order by s.day, s.start_time) from public.class_slots s
      where s.user_id = v_link.user_id and s.term = v_link.term), '[]'::jsonb)
  );
end $$;
revoke all on function public.get_shared_schedule(text) from public;
grant execute on function public.get_shared_schedule(text) to anon, authenticated;

-- Reset app data, not the Google/Supabase Auth account.
create or replace function public.reset_my_data()
returns void language plpgsql security invoker set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  delete from public.share_links where user_id = v_user;
  delete from public.class_slots where user_id = v_user;
  delete from public.calculators where user_id = v_user;
  delete from public.course_records where user_id = v_user;
  delete from public.next_term_plans where user_id = v_user;
  delete from public.profiles where user_id = v_user;
end $$;
revoke all on function public.reset_my_data() from public, anon;
grant execute on function public.reset_my_data() to authenticated;

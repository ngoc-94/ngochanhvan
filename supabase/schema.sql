-- Khu học viên Chị Hạnh Global: cấu trúc dữ liệu hiện tại.
-- Bài học KHÔNG nằm ở đây: web đọc thẳng từ các thư mục (Collection) trong Bunny
-- tên "PROGRAM 1: ...", "PROGRAM 2: ...", "PROGRAM 3: ...".

create or replace function public.lower_email() returns trigger
language plpgsql set search_path = '' as $$
begin new.email := lower(trim(new.email)); return new; end $$;

create table if not exists public.courses (
  slug text primary key, title text not null, subtitle text,
  sort_order int default 0, level int not null default 1
);
alter table public.courses enable row level security;
drop policy if exists "courses_read" on public.courses;
create policy "courses_read" on public.courses for select using (true);

insert into public.courses (slug, title, subtitle, sort_order, level) values
  ('break-the-salary-ceiling', 'BREAK THE SALARY CEILING', 'Program I · Salary Valuation · Negotiation Strategy · Offer Strategy', 1, 1),
  ('global-red-carpet',        'GLOBAL RED CARPET',        'Program II · Career Repositioning · Global Interview · Corporate Intelligence', 2, 2),
  ('star-read',                'STAR READ SYSTEM',         'Program III · System · Translation · Authority · Repositioning', 3, 3)
on conflict (slug) do nothing;

-- Học viên: level 1 = Program I, 2 = I+II, 3 = cả ba
create table if not exists public.members (
  email text primary key, level int not null check (level between 1 and 3),
  full_name text, note text, expires_at timestamptz, created_at timestamptz default now()
);
drop trigger if exists members_lower on public.members;
create trigger members_lower before insert or update on public.members
  for each row execute function public.lower_email();
alter table public.members enable row level security;
drop policy if exists "member_own" on public.members;
create policy "member_own" on public.members for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

-- Tiến độ xem theo video Bunny
create table if not exists public.video_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null, position_sec int not null default 0,
  completed boolean not null default false, updated_at timestamptz default now(),
  primary key (user_id, video_id)
);
alter table public.video_progress enable row level security;
drop policy if exists "vp_read" on public.video_progress;
create policy "vp_read" on public.video_progress for select to authenticated using (user_id = auth.uid());
drop policy if exists "vp_insert" on public.video_progress;
create policy "vp_insert" on public.video_progress for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "vp_update" on public.video_progress;
create policy "vp_update" on public.video_progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

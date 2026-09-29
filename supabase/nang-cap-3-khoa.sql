-- NÂNG CẤP: 3 khóa theo cấp + gộp mã video vào bảng bài học
-- Chạy 1 lần trong Supabase > SQL Editor. Chạy lại cũng không hỏng gì.

-- 1. Mỗi khóa có một cấp
alter table public.courses add column if not exists level int not null default 1;

insert into public.courses (slug, title, subtitle, sort_order, level) values
  ('break-the-salary-ceiling', 'BREAK THE SALARY CEILING', 'Program I · Salary Valuation · Negotiation Strategy · Offer Strategy', 1, 1),
  ('global-red-carpet',        'GLOBAL RED CARPET',        'Program II · Career Repositioning · Global Interview · Corporate Intelligence', 2, 2),
  ('star-read',                'STAR READ SYSTEM',         'Program III · System · Translation · Authority · Repositioning', 3, 3)
on conflict (slug) do update
  set title = excluded.title, subtitle = excluded.subtitle,
      sort_order = excluded.sort_order, level = excluded.level;

-- 2. Mã video Bunny nằm luôn trong bảng bài học
alter table public.lessons add column if not exists bunny_video_id text;

do $$ begin
  if to_regclass('public.lesson_videos') is not null then
    update public.lessons l set bunny_video_id = v.bunny_video_id
      from public.lesson_videos v where v.lesson_id = l.id;
    drop table public.lesson_videos;
  end if;
end $$;

-- Học viên đọc được bài học nhưng KHÔNG đọc được cột mã video
revoke select on public.lessons from anon, authenticated;
grant select (id, course_slug, position, title, summary, duration_min) on public.lessons to authenticated;

-- 3. Chuyển video vừa tải sang Khóa I, xóa bài mẫu thừa
delete from public.lessons where course_slug = 'star-read' and title like 'Ngày 2:%';
update public.lessons
  set course_slug = 'break-the-salary-ceiling',
      title = 'Buổi 1: Cơ chế định giá lương',
      summary = 'Luật ngầm giữ người giỏi ở mức thấp.'
  where course_slug = 'star-read' and title like 'Ngày 1:%';

-- 4. Học viên: mỗi người 1 dòng, email + cấp
create table if not exists public.members (
  email       text primary key,
  level       int  not null check (level between 1 and 3),  -- 1 = Khóa I, 2 = Khóa I+II, 3 = cả 3 khóa
  full_name   text,
  note        text,
  expires_at  timestamptz,                                   -- để trống = trọn đời
  created_at  timestamptz default now()
);

drop trigger if exists members_lower on public.members;
create trigger members_lower before insert or update on public.members
  for each row execute function public.lower_email();

alter table public.members enable row level security;
drop policy if exists "member_own" on public.members;
create policy "member_own" on public.members for select
  using (email = lower(auth.jwt() ->> 'email'));

-- Chuyển người đã ghi danh kiểu cũ sang bảng mới (cấp cao nhất đã có)
do $$ begin
  if to_regclass('public.enrollments') is not null then
    insert into public.members (email, level)
      select e.email, max(c.level) from public.enrollments e
      join public.courses c on c.slug = e.course_slug group by e.email
    on conflict (email) do update set level = greatest(public.members.level, excluded.level);
  end if;
end $$;

-- Chủ khóa học thấy tất cả
insert into public.members (email, level, full_name) values ('ngochanhvt2512@gmail.com', 3, 'Văn Thị Ngọc Hạnh')
on conflict (email) do update set level = 3;

-- 5. Quy tắc truy cập: cấp học viên >= cấp khóa
create or replace function public.is_enrolled(slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m, public.courses c
    where c.slug = $1
      and m.email = lower(auth.jwt() ->> 'email')
      and m.level >= c.level
      and (m.expires_at is null or m.expires_at > now())
  );
$$;

drop table if exists public.enrollments;

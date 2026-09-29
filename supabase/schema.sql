-- Khu học viên Chị Hạnh Global
-- Chạy toàn bộ file này 1 lần trong Supabase > SQL Editor.

-- 1. Khóa học (ai cũng đọc được tên khóa)
create table if not exists public.courses (
  slug        text primary key,             -- vd: star-read
  title       text not null,
  subtitle    text,
  sort_order  int  default 0
);

-- 2. Bài học (chỉ học viên đã ghi danh mới thấy)
create table if not exists public.lessons (
  id           bigint generated always as identity primary key,
  course_slug  text not null references public.courses(slug) on delete cascade,
  position     int  not null,               -- thứ tự bài: 1, 2, 3...
  title        text not null,
  summary      text,
  duration_min int,
  unique (course_slug, position)
);

-- 3. Mã video Bunny: KHÔNG ai đọc trực tiếp được.
--    Chỉ hàm máy chủ (netlify/functions/video-token) đọc bằng khóa service.
create table if not exists public.lesson_videos (
  lesson_id      bigint primary key references public.lessons(id) on delete cascade,
  bunny_video_id text not null
);

-- 4. Ghi danh theo email. Chị thêm email học viên vào đây là họ vào học được,
--    kể cả khi họ chưa từng đăng nhập.
create table if not exists public.enrollments (
  email        text not null,
  course_slug  text not null references public.courses(slug) on delete cascade,
  created_at   timestamptz default now(),
  expires_at   timestamptz,                 -- để trống = học trọn đời
  primary key (email, course_slug)
);

-- 5. Tiến độ xem của từng học viên
create table if not exists public.lesson_progress (
  user_id      uuid   not null references auth.users(id) on delete cascade,
  lesson_id    bigint not null references public.lessons(id) on delete cascade,
  position_sec int    not null default 0,
  completed    boolean not null default false,
  updated_at   timestamptz default now(),
  primary key (user_id, lesson_id)
);

-- Email luôn lưu chữ thường để so khớp không lệch
create or replace function public.lower_email() returns trigger language plpgsql as $$
begin new.email := lower(trim(new.email)); return new; end $$;
drop trigger if exists enrollments_lower on public.enrollments;
create trigger enrollments_lower before insert or update on public.enrollments
  for each row execute function public.lower_email();

-- Hàm kiểm tra: người đang đăng nhập có ghi danh khóa này không
create or replace function public.is_enrolled(slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.enrollments e
    where e.course_slug = slug
      and e.email = lower(auth.jwt() ->> 'email')
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

-- Bật bảo mật theo dòng
alter table public.courses         enable row level security;
alter table public.lessons         enable row level security;
alter table public.lesson_videos   enable row level security;
alter table public.enrollments     enable row level security;
alter table public.lesson_progress enable row level security;

drop policy if exists "courses_read"   on public.courses;
create policy "courses_read" on public.courses for select using (true);

drop policy if exists "lessons_enrolled" on public.lessons;
create policy "lessons_enrolled" on public.lessons for select
  using (public.is_enrolled(course_slug));

-- lesson_videos: cố ý KHÔNG có policy nào => chỉ khóa service đọc được.

drop policy if exists "enroll_own" on public.enrollments;
create policy "enroll_own" on public.enrollments for select
  using (email = lower(auth.jwt() ->> 'email'));

drop policy if exists "progress_own_read" on public.lesson_progress;
create policy "progress_own_read" on public.lesson_progress for select
  using (user_id = auth.uid());
drop policy if exists "progress_own_write" on public.lesson_progress;
create policy "progress_own_write" on public.lesson_progress for insert
  with check (user_id = auth.uid());
drop policy if exists "progress_own_update" on public.lesson_progress;
create policy "progress_own_update" on public.lesson_progress for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ DỮ LIỆU MẪU (sửa lại cho đúng) ============
insert into public.courses (slug, title, subtitle, sort_order) values
  ('star-read', 'STAR READ SYSTEM', 'Đọc luật ngầm, định vị giá trị', 1)
on conflict (slug) do nothing;

insert into public.lessons (course_slug, position, title, summary, duration_min) values
  ('star-read', 1, 'Ngày 1: Vì sao người giỏi vẫn bị trả thấp', 'Nhận diện điểm mù "cứ làm tốt rồi sẽ được ghi nhận".', 30),
  ('star-read', 2, 'Ngày 2: Đọc luật ngầm trong MNC', 'Ai quyết định ngân sách, ai ảnh hưởng thăng chức.', 35)
on conflict do nothing;

-- Dán mã video Bunny thật vào đây (lấy trong Bunny > Stream > video > Video ID)
-- insert into public.lesson_videos (lesson_id, bunny_video_id)
--   select id, 'MA-VIDEO-BUNNY-BAI-1' from public.lessons where course_slug='star-read' and position=1;

-- Ghi danh học viên (thay bằng email Gmail của học viên)
-- insert into public.enrollments (email, course_slug) values ('hocvien@gmail.com', 'star-read');

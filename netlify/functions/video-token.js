// Cấp link video Bunny có chữ ký, chỉ cho học viên đã ghi danh.
// Biến môi trường cần đặt trong Netlify > Site settings > Environment variables:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BUNNY_LIBRARY_ID, BUNNY_TOKEN_KEY
const crypto = require("crypto");

const LINK_TTL_SEC = 60 * 60 * 3; // link sống 3 tiếng, hết hạn thì tải lại trang

const json = (status, body) => ({
  statusCode: status,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BUNNY_LIBRARY_ID, BUNNY_TOKEN_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !BUNNY_LIBRARY_ID || !BUNNY_TOKEN_KEY) {
    return json(500, { error: "missing_config" });
  }

  const auth = event.headers.authorization || event.headers.Authorization || "";
  const userToken = auth.replace(/^Bearer\s+/i, "");
  const lessonId = parseInt((event.queryStringParameters || {}).lesson, 10);
  if (!userToken || !lessonId) return json(400, { error: "bad_request" });

  // Khóa kiểu mới (sb_secret_...) chỉ gửi qua apikey; khóa cũ dạng JWT gửi kèm Authorization
  const svc = SUPABASE_SERVICE_ROLE_KEY.startsWith("sb_")
    ? { apikey: SUPABASE_SERVICE_ROLE_KEY }
    : { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` };

  // 1. Xác minh người đăng nhập
  const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${userToken}` },
  });
  if (!u.ok) return json(401, { error: "not_signed_in" });
  const user = await u.json();
  const email = String(user.email || "").toLowerCase();

  // 2. Bài học thuộc khóa nào
  const l = await fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${lessonId}&select=course_slug`, { headers: svc });
  const [lesson] = await l.json();
  if (!lesson) return json(404, { error: "no_lesson" });

  // 3. Có ghi danh khóa đó không
  const e = await fetch(
    `${SUPABASE_URL}/rest/v1/enrollments?email=eq.${encodeURIComponent(email)}` +
      `&course_slug=eq.${encodeURIComponent(lesson.course_slug)}&select=expires_at`,
    { headers: svc }
  );
  const [enr] = await e.json();
  if (!enr || (enr.expires_at && new Date(enr.expires_at) < new Date())) {
    return json(403, { error: "not_enrolled" });
  }

  // 4. Lấy mã video và ký link
  const v = await fetch(`${SUPABASE_URL}/rest/v1/lesson_videos?lesson_id=eq.${lessonId}&select=bunny_video_id`, { headers: svc });
  const [video] = await v.json();
  if (!video) return json(404, { error: "no_video" });

  const expires = Math.floor(Date.now() / 1000) + LINK_TTL_SEC;
  const token = crypto
    .createHash("sha256")
    .update(BUNNY_TOKEN_KEY + video.bunny_video_id + expires)
    .digest("hex");

  const url =
    `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${video.bunny_video_id}` +
    `?token=${token}&expires=${expires}&autoplay=false&preload=true&responsive=true`;

  return json(200, { url });
};

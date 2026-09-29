// Hàm dùng chung cho các Netlify function của khu học viên.
// Biến môi trường: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//                  BUNNY_LIBRARY_ID, BUNNY_TOKEN_KEY, BUNNY_API_KEY
const env = process.env;

const json = (status, body) => ({
  statusCode: status,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
  body: JSON.stringify(body),
});

const missingConfig = () =>
  ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "BUNNY_LIBRARY_ID", "BUNNY_TOKEN_KEY", "BUNNY_API_KEY"].filter((k) => !env[k]);

const svcHeaders = () =>
  env.SUPABASE_SERVICE_ROLE_KEY.startsWith("sb_")
    ? { apikey: env.SUPABASE_SERVICE_ROLE_KEY }
    : { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };

async function sb(path) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { headers: svcHeaders() });
  if (!r.ok) throw new Error(`supabase ${r.status}`);
  return r.json();
}

// Người đăng nhập + cấp học của họ (0 = chưa có quyền)
async function whoAmI(event) {
  const auth = event.headers.authorization || event.headers.Authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const user = await r.json();
  const email = String(user.email || "").toLowerCase();
  const [m] = await sb(`members?email=eq.${encodeURIComponent(email)}&select=level,expires_at`);
  const expired = m && m.expires_at && new Date(m.expires_at) < new Date();
  return { email, level: m && !expired ? m.level : 0 };
}

async function bunny(path) {
  const r = await fetch(`https://video.bunnycdn.com/library/${env.BUNNY_LIBRARY_ID}/${path}`, {
    headers: { AccessKey: env.BUNNY_API_KEY, accept: "application/json" },
  });
  if (!r.ok) throw new Error(`bunny ${r.status}`);
  return r.json();
}

// "PROGRAM 1: ...", "Program II - ..." => 1, 2, 3
function levelFromName(name) {
  const m = String(name || "").match(/program\s*[:#-]?\s*(\d+|iii|ii|i)\b/i);
  if (!m) return 0;
  const v = m[1].toLowerCase();
  return { i: 1, ii: 2, iii: 3 }[v] || parseInt(v, 10) || 0;
}

// Thư mục Bunny => cấp khóa
async function collectionsByLevel() {
  const data = await bunny("collections?page=1&itemsPerPage=100");
  const map = {};
  (data.items || []).forEach((c) => {
    const lv = levelFromName(c.name);
    if (lv && !map[lv]) map[lv] = c.guid;
  });
  return map;
}

// "01 WS1.mp4" => { num: 1, title: "WS1" }
// "Bài 3 - WS P3" => { num: 3, title: "Bài 3 - WS P3" }
function cleanTitle(t) {
  let s = String(t || "")
    .normalize("NFC")                                  // gộp dấu tiếng Việt về một kiểu
    .replace(/[​-‍﻿ ]/g, " ")      // bỏ ký tự vô hình
    .replace(/\.(mp4|mov|m4v|mkv|webm|avi)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  // Số đứng đầu tên: dùng để xếp rồi ẩn đi
  const m = s.match(/^(\d+)\s*[.\-_:)]?\s*(.*)$/);
  if (m && m[2]) return { num: parseInt(m[1], 10), title: m[2].trim() };
  // Còn lại: lấy con số đầu tiên có trong tên để xếp, giữ nguyên tên
  const any = s.match(/\d+/);
  return { num: any ? parseInt(any[0], 10) : null, title: s };
}

// Danh sách bài của một thư mục, đã xếp thứ tự
async function lessonsOf(collectionGuid) {
  const data = await bunny(`videos?page=1&itemsPerPage=200&collection=${collectionGuid}&orderBy=date`);
  const items = (data.items || [])
    .filter((v) => ![0, 1, 2, 5, 6].includes(v.status)) // ẩn video đang tải, đang xử lý hoặc lỗi
    .map((v) => ({ ...cleanTitle(v.title), id: v.guid, seconds: v.length || 0, uploaded: v.dateUploaded || "" }));
  items.sort((a, b) => {
    if (a.num != null && b.num != null && a.num !== b.num) return a.num - b.num;
    if (a.num != null && b.num == null) return -1;
    if (a.num == null && b.num != null) return 1;
    return String(a.uploaded).localeCompare(String(b.uploaded));
  });
  return items.map((v, i) => ({
    id: v.id,
    position: i + 1,
    title: v.title,
    duration_min: v.seconds ? Math.max(1, Math.round(v.seconds / 60)) : null,
  }));
}

module.exports = { env, json, missingConfig, sb, whoAmI, bunny, levelFromName, cleanTitle, collectionsByLevel, lessonsOf };

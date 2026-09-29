// Lớp dữ liệu dùng chung cho khu học viên.
// ?demo=1 trên URL => chạy dữ liệu mẫu, không cần Supabase (để xem giao diện).
(function () {
  const cfg = window.HOC_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  const demo = params.get("demo") === "1";
  const sb = !demo && configured && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  // ---------- dữ liệu mẫu ----------
  const D = {
    user: { email: "hocvien@gmail.com", user_metadata: { full_name: "Học viên xem thử" } },
    courses: [
      { slug: "break-the-salary-ceiling", title: "BREAK THE SALARY CEILING", subtitle: "Khóa I" },
      { slug: "global-red-carpet", title: "GLOBAL RED CARPET", subtitle: "Khóa II" },
    ],
    lessons: [
      { id: 1, course_slug: "break-the-salary-ceiling", position: 1, title: "Ngày 1: Vì sao người giỏi vẫn bị trả thấp", summary: "Nhận diện điểm mù \"cứ làm tốt rồi sẽ được ghi nhận\".", duration_min: 30 },
      { id: 2, course_slug: "break-the-salary-ceiling", position: 2, title: "Ngày 2: Đọc luật ngầm trong MNC", summary: "Ai quyết định ngân sách, ai ảnh hưởng thăng chức, ai giữ câu chuyện trong tổ chức.", duration_min: 35 },
      { id: 3, course_slug: "break-the-salary-ceiling", position: 3, title: "Ngày 3: Kể công mà không khoe", summary: "Biến thành tích thành ngôn ngữ lãnh đạo nghe hiểu.", duration_min: 28 },
    ],
  };
  const demoKey = "hoc_demo_progress";
  const demoLoad = () => { try { return JSON.parse(sessionStorage.getItem(demoKey)) || { 1: { position_sec: 1800, completed: true }, 2: { position_sec: 843, completed: false } }; } catch (e) { return {}; } };
  const demoSave = (p) => { try { sessionStorage.setItem(demoKey, JSON.stringify(p)); } catch (e) {} };

  const HOC = {
    demo, configured,
    zalo: cfg.ZALO_HO_TRO || "",
    q: (k) => params.get(k),
    link(path) { return demo ? path + (path.includes("?") ? "&" : "?") + "demo=1" : path; },

    async user() {
      if (demo) return D.user;
      if (!sb) return null;
      const { data } = await sb.auth.getSession();
      return data.session ? data.session.user : null;
    },

    async signIn() {
      if (demo) { location.href = HOC.link("./"); return; }
      await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: location.origin + location.pathname + location.search },
      });
    },

    async signOut() {
      if (sb) await sb.auth.signOut();
      location.href = demo ? "./?demo=1" : "./";
    },

    // Gọi 1 lần: các khóa được học + bài lấy từ thư mục Bunny
    _cache: null,
    async _load() {
      if (HOC._cache) return HOC._cache;
      if (demo) {
        HOC._cache = D.courses.map((c) => ({ ...c, lessons: D.lessons.filter((l) => l.course_slug === c.slug) }));
        return HOC._cache;
      }
      const { data } = await sb.auth.getSession();
      const r = await fetch("/.netlify/functions/khoa-hoc", {
        headers: { Authorization: "Bearer " + data.session.access_token },
      });
      const j = await r.json().catch(() => ({}));
      HOC._cache = r.ok ? j.courses || [] : [];
      return HOC._cache;
    },

    async myCourses() { return HOC._load(); },
    async course(slug) { return (await HOC._load()).find((c) => c.slug === slug) || null; },
    async lessons(slug) { const c = await HOC.course(slug); return c ? c.lessons : []; },

    async progress(ids) {
      if (demo) return demoLoad();
      if (!ids.length) return {};
      const { data } = await sb.from("video_progress").select("video_id, position_sec, completed").in("video_id", ids);
      const map = {};
      (data || []).forEach((r) => (map[r.video_id] = r));
      return map;
    },

    async saveProgress(videoId, sec, completed) {
      sec = Math.max(0, Math.floor(sec || 0));
      if (demo) {
        const p = demoLoad();
        const prev = p[videoId] || {};
        p[videoId] = { position_sec: sec, completed: !!(completed || prev.completed) };
        demoSave(p);
        return;
      }
      const u = await HOC.user();
      if (!u) return;
      const row = { user_id: u.id, video_id: videoId, position_sec: sec, updated_at: new Date().toISOString() };
      if (completed) row.completed = true;
      await sb.from("video_progress").upsert(row, { onConflict: "user_id,video_id" });
    },

    async videoUrl(videoId) {
      if (demo) return null;
      const { data } = await sb.auth.getSession();
      const r = await fetch("/.netlify/functions/video-token?video=" + encodeURIComponent(videoId), {
        headers: { Authorization: "Bearer " + data.session.access_token },
      });
      if (!r.ok) return { error: (await r.json().catch(() => ({}))).error || "error" };
      return r.json();
    },

    fmt(sec) {
      sec = Math.floor(sec || 0);
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
      const mm = h ? String(m).padStart(2, "0") : m;
      return (h ? h + ":" : "") + mm + ":" + String(s).padStart(2, "0");
    },
    esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); },
  };

  window.HOC = HOC;
})();

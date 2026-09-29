// Trả về các khóa học viên được học + danh sách bài lấy thẳng từ thư mục Bunny.
const { json, missingConfig, sb, whoAmI, collectionsByLevel, lessonsOf } = require("../lib/common.js");

exports.handler = async (event) => {
  const miss = missingConfig();
  if (miss.length) return json(500, { error: "missing_config", missing: miss });
  try {
    const me = await whoAmI(event);
    if (!me) return json(401, { error: "not_signed_in" });
    if (!me.level) return json(200, { level: 0, courses: [] });

    const [courses, cols] = await Promise.all([
      sb(`courses?level=lte.${me.level}&select=slug,title,subtitle,level&order=sort_order`),
      collectionsByLevel(),
    ]);
    const out = await Promise.all(
      courses.map(async (c) => ({ ...c, lessons: cols[c.level] ? await lessonsOf(cols[c.level]) : [] }))
    );
    return json(200, { level: me.level, courses: out });
  } catch (e) {
    return json(502, { error: "upstream", detail: String(e.message || e) });
  }
};

// Cấp link video Bunny có chữ ký, chỉ khi video nằm trong thư mục khóa mà học viên đủ cấp.
const crypto = require("crypto");
const { env, json, missingConfig, whoAmI, bunny, levelFromName } = require("../lib/common.js");

const LINK_TTL_SEC = 60 * 60 * 3; // link sống 3 tiếng, hết hạn thì tải lại trang

exports.handler = async (event) => {
  const miss = missingConfig();
  if (miss.length) return json(500, { error: "missing_config", missing: miss });

  const videoId = String((event.queryStringParameters || {}).video || "");
  if (!/^[0-9a-f-]{36}$/i.test(videoId)) return json(400, { error: "bad_request" });

  try {
    const me = await whoAmI(event);
    if (!me) return json(401, { error: "not_signed_in" });

    const video = await bunny(`videos/${videoId}`);
    if (!video || !video.collectionId) return json(404, { error: "no_video" });
    const col = await bunny(`collections/${video.collectionId}`);
    const needLevel = levelFromName(col && col.name);
    if (!needLevel || me.level < needLevel) return json(403, { error: "not_enrolled" });

    const expires = Math.floor(Date.now() / 1000) + LINK_TTL_SEC;
    const token = crypto.createHash("sha256").update(env.BUNNY_TOKEN_KEY + videoId + expires).digest("hex");
    const url =
      `https://player.mediadelivery.net/embed/${env.BUNNY_LIBRARY_ID}/${videoId}` +
      `?token=${token}&expires=${expires}&autoplay=false&preload=true&responsive=true`;
    return json(200, { url });
  } catch (e) {
    return json(502, { error: "upstream", detail: String(e.message || e) });
  }
};

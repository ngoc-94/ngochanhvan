// Kiểm tra phiên bản đang chạy trên web (không chứa dữ liệu học viên)
const { cleanTitle } = require("../lib/common.js");
exports.handler = async () => {
  const mau = ["Bài 4 - WS P4", "Bài 3 - WS P3"].map((t) => t.normalize("NFD"));
  return {
    statusCode: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify({ version: "20260929-171657", thu_sap_xep: mau.map((t) => cleanTitle(t)) }),
  };
};

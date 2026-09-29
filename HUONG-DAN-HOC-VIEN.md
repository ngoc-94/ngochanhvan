# Khu học viên ngochanhvan.com/hoc

Học viên đăng nhập bằng Gmail, chỉ thấy khóa đã được mở, video tự nhảy tới đúng chỗ đã xem.

Xem giao diện mẫu (chưa cần cài gì): `https://ngochanhvan.com/hoc/?demo=1`

## Cài đặt 1 lần (khoảng 45 phút)

### 1. Supabase (đăng nhập + dữ liệu, miễn phí)
1. Tạo tài khoản ở supabase.com, tạo project mới, chọn vùng **Singapore**.
2. Vào **SQL Editor**, chạy `supabase/schema.sql`.
3. **Authentication > Providers > Google**: bật lên, dán Client ID và Client Secret của Google
   (tạo trong Google Cloud Console > APIs & Services > Credentials > OAuth client ID, loại Web application,
   ô "Authorized redirect URIs" dán link callback mà Supabase hiện ra).
4. **Authentication > URL Configuration**:
   - Site URL: `https://ngochanhvan.com`
   - Redirect URLs: thêm `https://ngochanhvan.com/hoc/**`
5. **Project Settings > API**: chép `Project URL` và `anon public key` vào file `hoc/config.js`.
   Chép thêm `service_role key` (KHÔNG dán vào file nào, chỉ dùng ở bước 3).

### 2. Bunny Stream (video, trả theo dùng, vài USD/tháng)
1. Tạo tài khoản ở bunny.net, vào **Stream > Add Video Library**.
2. Upload video bài giảng. Mỗi video có một **Video ID**.
3. Trong thư viện, mục **Security**:
   - Bật **Embed view token authentication**
   - **Allowed referrers**: thêm `ngochanhvan.com`
4. Chép **Library ID** và **Token Authentication Key**.

### 3. Netlify
**Site settings > Environment variables**, thêm 4 biến:

| Tên | Giá trị |
|---|---|
| SUPABASE_URL | Project URL của Supabase |
| SUPABASE_SERVICE_ROLE_KEY | service_role key |
| BUNNY_LIBRARY_ID | Library ID |
| BUNNY_TOKEN_KEY | Token Authentication Key |
| BUNNY_API_KEY | API Key của thư viện (Bunny > thư viện > API) |

Sau đó **Deploys > Trigger deploy**.

## Việc hằng ngày

**Thêm bài học: chỉ làm trong Bunny.**
- 3 thư mục (Collection) trong thư viện Bunny: `PROGRAM 1: BREAK THE SALARY CEILING`, `PROGRAM 2: GLOBAL RED CARPET`, `PROGRAM 3: STAR READ SYSTEM`. Tên phải bắt đầu bằng `PROGRAM 1/2/3`.
- Video nằm trong thư mục nào thì thuộc khóa đó. Tên video = tên bài học viên thấy.
- Đặt số đầu tên để xếp thứ tự: `01 WS1`, `02 WS2`... Web tự ẩn số và đuôi `.mp4`. Không có số thì xếp theo thứ tự tải lên.
- Đổi tên bài: đổi tên video. Chuyển khóa: chuyển video sang thư mục khác.

**Thêm học viên:** nhắn Claude (đã kết nối Supabase), hoặc Supabase > Table Editor > bảng `members`: điền `email` và `level` (1 = Program I, 2 = I+II, 3 = cả ba).

## Bảo mật hoạt động thế nào
- Chưa đăng nhập hoặc chưa được mở khóa: không thấy danh sách bài, không lấy được video.
- Mã video không bao giờ lộ ra trình duyệt trước khi hệ thống kiểm tra ghi danh.
- Link video có chữ ký, hết hạn sau 3 tiếng, và chỉ phát được trên ngochanhvan.com.
  Copy link gửi nhóm Zalo sẽ không xem được.

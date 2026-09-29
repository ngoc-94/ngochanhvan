# Khu học viên ngochanhvan.com/hoc

Học viên đăng nhập bằng Gmail, chỉ thấy khóa đã được mở, video tự nhảy tới đúng chỗ đã xem.

Xem giao diện mẫu (chưa cần cài gì): `https://ngochanhvan.com/hoc/?demo=1`

## Cài đặt 1 lần (khoảng 45 phút)

### 1. Supabase (đăng nhập + dữ liệu, miễn phí)
1. Tạo tài khoản ở supabase.com, tạo project mới, chọn vùng **Singapore**.
2. Vào **SQL Editor**, chạy lần lượt `supabase/schema.sql` rồi `supabase/nang-cap-3-khoa.sql`.
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

Sau đó **Deploys > Trigger deploy**.

## Việc hằng ngày (Supabase > Table Editor)

Chỉ có 2 bảng chị cần đụng tới, sửa như Excel: bấm đúp vào ô, gõ, Enter.

**Bảng `members`: học viên.** Mỗi người một dòng.
| Cột | Điền gì |
|---|---|
| email | Gmail học viên dùng để đăng nhập |
| level | 1 = Break the Salary Ceiling · 2 = thêm Global Red Carpet · 3 = cả 3 khóa |
| full_name, note | Tùy chọn |
| expires_at | Để trống = học trọn đời |

Học viên nâng cấp khóa: chỉ sửa số ở cột `level`.

**Bảng `lessons`: bài học.** Mỗi video một dòng.
| Cột | Điền gì |
|---|---|
| course_slug | `break-the-salary-ceiling`, `global-red-carpet` hoặc `star-read` |
| position | Thứ tự bài trong khóa: 1, 2, 3... |
| title | Tên bài, vd: "Buổi 1: Cơ chế định giá lương" |
| summary | Một câu mô tả dưới video (tùy chọn) |
| duration_min | Số phút (tùy chọn) |
| bunny_video_id | Video ID trong Bunny |

Chuyển video sang khóa khác: sửa cột `course_slug`.

## Bảo mật hoạt động thế nào
- Chưa đăng nhập hoặc chưa được mở khóa: không thấy danh sách bài, không lấy được video.
- Mã video không bao giờ lộ ra trình duyệt trước khi hệ thống kiểm tra ghi danh.
- Link video có chữ ký, hết hạn sau 3 tiếng, và chỉ phát được trên ngochanhvan.com.
  Copy link gửi nhóm Zalo sẽ không xem được.

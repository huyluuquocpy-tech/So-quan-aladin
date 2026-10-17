# Sổ quán The Aladin

App bán hàng, thu chi, kho nguyên liệu và báo cáo lãi lỗ cho quán **The Aladin – Coffee & More**.
Cài lên màn hình chính như app thật, **bán được cả khi mất mạng** (đơn lưu tạm trên máy, có mạng lại tự gửi lên). Miễn phí hoàn toàn.

- Giao diện: GitHub Pages
- Dữ liệu và đăng nhập: Supabase, gói Free (500 MB dữ liệu, không giới hạn số lượt đọc/ghi)

> Lưu ý gói Free của Supabase: dự án **tự tạm dừng nếu 7 ngày liền không ai dùng** (ví dụ quán nghỉ Tết).
> Khi đó vào supabase.com → dự án → bấm **Restore**, vài phút là chạy lại, dữ liệu không mất.

## Cài đặt lần đầu (khoảng 15 phút, nên làm trên máy tính)

### 1. Dự án Supabase
Đã có sẵn: dự án **Aladin** (`ymwubudtbihoqfybrgqg`), đã gắn vào `config.js`.

### 2. Tạo bảng và luật bảo mật
1. Menu trái **SQL Editor** → **New query**.
2. Mở file `supabase.sql` trong repo này, copy toàn bộ, dán vào.
3. (Tùy chọn) thêm email người cùng làm ở mục (2).
4. Bấm **Run**. Thấy "Success" là xong.

### 3. Đặt mật khẩu quản lý
App có 2 chế độ:
- **Nhân viên:** mở link là bán được ngay, không cần đăng nhập. Chỉ thấy tab Bán hàng.
- **Quản lý:** bấm vào Thu chi / Kho & món / Báo cáo → nhập **mật khẩu quản lý**.

Mật khẩu quản lý là mật khẩu của một tài khoản Supabase:
1. Menu trái **Authentication** → **Users** → **Add user** → **Create new user**.
2. Email `huyluuquocpy@gmail.com` (đúng email trong `config.js` và trong `supabase.sql`),
   mật khẩu = mật khẩu quản lý bạn muốn (nên từ 8 ký tự), tích **Auto Confirm User** → **Create user**.
3. **Authentication → Sign In / Providers** → tắt **Allow new users to sign up**.

Đổi mật khẩu sau này: mở khoá quản lý trong app → nút **Đổi mật khẩu** cạnh nút Khoá lại.

### 4. Khóa kết nối
Đã điền sẵn trong `config.js` (khóa **anon**, để công khai vẫn an toàn vì dữ liệu được khóa bằng đăng nhập + luật ở bước 2).
**Không bao giờ** dán khóa `service_role` / `secret` vào app.

### 5. Bật GitHub Pages
Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch `main`, thư mục `/ (root)` → **Save**.
Sau 1–2 phút app có tại `https://huyluuquocpy-tech.github.io/So-quan-aladin/`

### 6. Đăng nhập và nạp dữ liệu ban đầu
Mở địa chỉ trên → bấm **Quản lý** → nhập mật khẩu quản lý → bấm **Nạp dữ liệu** ở thanh trên cùng (menu 51 món, công thức mẫu,
39 nguyên liệu chưa có giá). Chỉ làm một lần.

### 7. Cài lên màn hình chính
- **iPhone:** mở bằng **Safari** → nút Chia sẻ → **Thêm vào MH chính**.
- **Android:** **Chrome** → menu ⋮ → **Cài đặt ứng dụng**.
- **Máy tính:** Chrome/Edge → biểu tượng cài đặt cuối thanh địa chỉ.

## Dùng hằng ngày
- **Nhân viên:** gửi link cho người trong quán, mở bằng Safari/Chrome rồi thêm vào màn hình chính.
  Máy chủ chỉ cho nhân viên xem menu và đơn hôm nay, chỉ cho **thêm đơn mới** — không sửa, xoá đơn,
  không xem thu chi, giá vốn, kho, báo cáo được (kể cả khi biết cách mò).
- **Quản lý:** tự khoá lại khi 15 phút không chạm, khi rời app hơn 5 phút, hoặc khi tắt mở lại app.
  Bấm **Khoá lại** trước khi đưa máy cho người khác. Mở khoá cần có mạng.
- **Sửa / huỷ / xoá đơn** nằm ở tab Báo cáo → chỉ quản lý làm được (tránh thất thoát tiền).
- **Sao lưu:** tab Báo cáo → **Sao lưu Excel** (nên làm mỗi tuần). Ngoài ra trong Supabase →
  **Table Editor** có sẵn 3 bảng xem nhanh: `v_don_hang`, `v_thu_chi`, `v_doanh_thu_ngay` → **Export to CSV**.
- **Mất mạng:** cứ bán bình thường, góc trên hiện "Mất mạng · lưu tạm". Có mạng lại tự gửi.
  Việc quản lý làm lúc mất mạng (vd ghi khoản chi) sẽ chờ đến lần mở khoá quản lý tiếp theo mới gửi.

## Cập nhật app
Sửa file → commit → **tăng `VERSION` trong `sw.js`** (vd `soquan-v3`).
Máy đang dùng sẽ hiện thanh "Có bản cập nhật mới" → bấm **Cập nhật**. Dữ liệu không bị ảnh hưởng.

## Cấu trúc
| File | Vai trò |
|---|---|
| `index.html` | Toàn bộ app: bán hàng, thu chi, kho, báo cáo |
| `bridge.js` | Nối app với Supabase, đăng nhập, lưu tạm khi mất mạng, báo cập nhật |
| `config.js` | Địa chỉ + khóa anon Supabase của quán |
| `supabase.sql` | Tạo bảng, luật bảo mật, bảng xem nhanh |
| `sw.js`, `manifest.webmanifest`, `icons/` | Cài như app, mở được khi mất mạng |
| `seed.json` | Dữ liệu ban đầu: menu, công thức mẫu, nguyên liệu |

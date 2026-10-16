# Sổ quán The Aladin

App bán hàng, thu chi, kho nguyên liệu và báo cáo lãi lỗ cho quán **The Aladin – Coffee & More**.
Cài lên màn hình chính như app thật, **bán được cả khi mất mạng** (đơn lưu tạm trên máy, có mạng lại tự gửi lên). Miễn phí hoàn toàn.

- Giao diện: GitHub Pages
- Dữ liệu và đăng nhập: Supabase, gói Free (500 MB dữ liệu, không giới hạn số lượt đọc/ghi)

> Lưu ý gói Free của Supabase: dự án **tự tạm dừng nếu 7 ngày liền không ai dùng** (ví dụ quán nghỉ Tết).
> Khi đó vào supabase.com → dự án → bấm **Restore**, vài phút là chạy lại, dữ liệu không mất.

## Cài đặt lần đầu (khoảng 15 phút, nên làm trên máy tính)

### 1. Tạo dự án Supabase
1. Vào https://supabase.com → **Start your project** → đăng nhập bằng GitHub.
2. **New project** → tên `so-quan-aladin` → đặt mật khẩu database (lưu lại) →
   Region: **Southeast Asia (Singapore)** → **Create new project**. Đợi 1–2 phút.

### 2. Tạo bảng và luật bảo mật
1. Menu trái **SQL Editor** → **New query**.
2. Mở file `supabase.sql` trong repo này, copy toàn bộ, dán vào.
3. **Sửa 2 email** ở mục (2) thành email của bạn và người cùng làm.
4. Bấm **Run**. Thấy "Success" là xong.

### 3. Tạo tài khoản đăng nhập
1. Menu trái **Authentication** → **Users** → **Add user** → **Create new user**.
2. Nhập email (đúng email ở bước 2) + mật khẩu, tích **Auto Confirm User** → **Create user**.
   Làm lần nữa cho người cùng làm.
3. **Authentication → Sign In / Providers** (hoặc **Settings**) → tắt **Allow new users to sign up**
   để người lạ không tự tạo tài khoản được.

### 4. Lấy khóa kết nối
**Project Settings → API** (hoặc **Data API**): copy **Project URL** và khóa **anon public**
(có nơi gọi là *publishable key*). Gửi 2 thông tin này cho Claude, hoặc tự dán vào `config.js`:

```js
window.SUPABASE_URL = "https://xxxx.supabase.co";
window.SUPABASE_ANON_KEY = "eyJ...";
```
Khóa anon để công khai vẫn an toàn vì dữ liệu được khóa bằng đăng nhập + luật ở bước 2.
**Không bao giờ** dán khóa `service_role` / `secret` vào app.

### 5. Bật GitHub Pages
Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch `main`, thư mục `/ (root)` → **Save**.
Sau 1–2 phút app có tại `https://huyluuquocpy-tech.github.io/so-quan-aladin/`

### 6. Đăng nhập và nạp dữ liệu ban đầu
Mở địa chỉ trên → đăng nhập → bấm **Nạp dữ liệu** ở thanh trên cùng (menu 51 món, công thức mẫu,
39 nguyên liệu chưa có giá). Chỉ làm một lần.

### 7. Cài lên màn hình chính
- **iPhone:** mở bằng **Safari** → nút Chia sẻ → **Thêm vào MH chính**.
- **Android:** **Chrome** → menu ⋮ → **Cài đặt ứng dụng**.
- **Máy tính:** Chrome/Edge → biểu tượng cài đặt cuối thanh địa chỉ.

## Dùng hằng ngày
- **Sao lưu:** tab Báo cáo → **Sao lưu Excel** (nên làm mỗi tuần). Ngoài ra trong Supabase →
  **Table Editor** có sẵn 3 bảng xem nhanh: `v_don_hang`, `v_thu_chi`, `v_doanh_thu_ngay` → **Export to CSV**.
- **Mất mạng:** cứ bán bình thường, góc trên hiện "Mất mạng · lưu tạm". Có mạng lại tự gửi.
  Đừng đăng xuất khi còn dữ liệu chưa gửi (app sẽ chặn).

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

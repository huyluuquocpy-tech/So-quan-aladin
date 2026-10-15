# Sổ quán The Aladin

App bán hàng, thu chi, kho nguyên liệu và báo cáo lãi lỗ cho quán **The Aladin – Coffee & More**.
Chạy trên trình duyệt, cài lên màn hình chính như app thật, dùng được khi mất mạng
(đơn được lưu tạm trên máy và tự đồng bộ khi có mạng lại). Hoàn toàn miễn phí.

- Giao diện: GitHub Pages (miễn phí)
- Dữ liệu và đăng nhập: Firebase Firestore + Authentication, gói Spark (miễn phí:
  50.000 lượt đọc và 20.000 lượt ghi mỗi ngày, dư cho một quán nước)

## Cài đặt lần đầu (khoảng 15 phút, làm trên máy tính cho dễ)

### 1. Tạo kho dữ liệu Firebase
1. Vào https://console.firebase.google.com → **Create a project** → đặt tên `so-quan-aladin` →
   tắt Google Analytics → **Create**.
2. Menu trái **Build → Firestore Database** → **Create database** → chọn vị trí
   `asia-southeast1 (Singapore)` → **Start in production mode** → **Create**.
3. Tab **Rules** → xóa hết, dán nội dung file `firestore.rules` → sửa 2 email thành email thật
   của bạn và người cùng làm → **Publish**.
4. Menu trái **Build → Authentication** → **Get started** → **Email/Password** → bật **Enable** → **Save**.
5. Tab **Users** → **Add user** → tạo tài khoản cho bạn và người cùng làm (đúng 2 email ở bước 3).
6. Bánh răng ⚙ → **Project settings** → kéo xuống **Your apps** → bấm biểu tượng **</>** (Web) →
   đặt tên `so-quan` → **Register app** → copy đoạn `firebaseConfig = { ... }`.
7. **Authentication → Settings → Authorized domains** → **Add domain** →
   `huyluuquocpy-tech.github.io`.

### 2. Dán cấu hình vào app
Mở file `config.js` trên GitHub (bấm biểu tượng bút chì), thay `null` bằng đoạn cấu hình vừa copy:

```js
window.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```
Bấm **Commit changes**. Các khóa này không phải mật khẩu; dữ liệu được bảo vệ bằng đăng nhập
và luật ở bước 1.3, nên để công khai vẫn an toàn.

### 3. Bật GitHub Pages
Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main`, thư mục `/ (root)` → **Save**.
Sau 1–2 phút app có ở địa chỉ: `https://huyluuquocpy-tech.github.io/so-quan-aladin/`

### 4. Đăng nhập và nạp dữ liệu
Mở địa chỉ trên → đăng nhập → bấm **Nạp dữ liệu** ở thanh phía trên để nạp menu 51 món,
công thức mẫu và 39 nguyên liệu (chỉ cần làm một lần).

### 5. Cài lên màn hình chính
- **iPhone:** mở bằng **Safari** → nút Chia sẻ → **Thêm vào MH chính** → **Thêm**.
- **Android:** mở bằng **Chrome** → menu ⋮ → **Cài đặt ứng dụng** (hoặc **Thêm vào màn hình chính**).
- **Máy tính:** Chrome/Edge → biểu tượng cài đặt ở cuối thanh địa chỉ.

## Cập nhật app
Sửa file trên GitHub → commit. Nếu đổi giao diện, tăng `VERSION` trong `sw.js`
(ví dụ `soquan-v2`) để các máy tải bản mới. Dữ liệu trên Firebase không bị ảnh hưởng.

## Cấu trúc
| File | Vai trò |
|---|---|
| `index.html` | Toàn bộ app (bán hàng, thu chi, kho, báo cáo) |
| `bridge.js` | Nối app với Firebase, màn đăng nhập, lưu tạm khi mất mạng |
| `config.js` | Cấu hình Firebase của quán |
| `sw.js`, `manifest.webmanifest`, `icons/` | Cài như app và mở được khi mất mạng |
| `seed.json` | Dữ liệu ban đầu: menu, công thức mẫu, nguyên liệu |
| `firestore.rules` | Luật bảo mật: chỉ 2 email được phép đọc/ghi |

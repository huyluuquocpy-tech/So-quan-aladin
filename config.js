/* Kết nối Supabase của quán.
   Lấy ở: Supabase → dự án của bạn → Project Settings → API (hoặc Data API).
   - SUPABASE_URL: mục "Project URL", dạng https://xxxx.supabase.co
   - SUPABASE_ANON_KEY: mục "anon public" (hoặc "publishable key")
   Khóa anon không phải mật khẩu: dữ liệu được bảo vệ bằng đăng nhập + luật bảo mật trong supabase.sql,
   nên để công khai trên GitHub vẫn an toàn. TUYỆT ĐỐI không dán khóa "service_role" / "secret" vào đây. */
window.SUPABASE_URL = "";
window.SUPABASE_ANON_KEY = "";

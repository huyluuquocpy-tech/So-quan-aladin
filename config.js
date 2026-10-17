/* Kết nối Supabase của quán.
   Lấy ở: Supabase → dự án của bạn → Project Settings → API (hoặc Data API).
   - SUPABASE_URL: mục "Project URL", dạng https://xxxx.supabase.co
   - SUPABASE_ANON_KEY: mục "anon public" (hoặc "publishable key")
   Khóa anon không phải mật khẩu: dữ liệu được bảo vệ bằng đăng nhập + luật bảo mật trong supabase.sql,
   nên để công khai trên GitHub vẫn an toàn. TUYỆT ĐỐI không dán khóa "service_role" / "secret" vào đây. */
window.SUPABASE_URL = "https://ymwubudtbihoqfybrgqg.supabase.co";
/* Tài khoản quản lý: mật khẩu của tài khoản này chính là "mật khẩu quản lý" để vào Thu chi / Kho / Báo cáo */
window.SUPABASE_MANAGER_EMAIL = "huyluuquocpy@gmail.com";
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inltd3VidWR0Ymlob3FmeWJyZ3FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNTI0NzAsImV4cCI6MjEwNzcyODQ3MH0.fomOo2z6wG6HzvdQAdowbqzLn91Xjfd7PrLHIOStfaY";

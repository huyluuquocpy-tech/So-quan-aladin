-- =====================================================================
-- Sổ quán The Aladin — thiết lập kho dữ liệu Supabase
-- Cách dùng: Supabase → SQL Editor → New query → dán toàn bộ file này → bấm Run.
--            Chạy lại nhiều lần vẫn an toàn.  Thêm người dùng: thêm email ở mục (2).
-- =====================================================================

-- (1) Bảng dữ liệu chung của app
create table if not exists public.docs (
  coll       text        not null,                      -- loại dữ liệu: orders, txns, products, ingredients...
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  day        text        generated always as (data->>'day') stored,
  updated_at timestamptz not null default now(),
  primary key (coll, id)
);
create index if not exists docs_coll_day_idx     on public.docs (coll, day);
create index if not exists docs_coll_updated_idx on public.docs (coll, updated_at);

create or replace function public.docs_touch() returns trigger
language plpgsql set search_path = public as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists docs_touch on public.docs;
create trigger docs_touch before insert or update on public.docs
  for each row execute function public.docs_touch();

-- (2) Danh sách email được phép dùng app — thêm email người cùng làm vào đây nếu cần
create table if not exists public.allowed_users (email text primary key);
alter table public.allowed_users enable row level security;   -- không ai đọc được bảng này qua app
insert into public.allowed_users (email) values
  ('huyluuquocpy@gmail.com')
on conflict do nothing;

create or replace function public.is_allowed() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_users
                 where lower(email) = lower(coalesce(auth.jwt()->>'email', '')));
$$;
revoke all on function public.is_allowed() from anon, public;
grant execute on function public.is_allowed() to authenticated;

-- (3) Luật bảo mật: chỉ người đã đăng nhập VÀ có trong danh sách mới đọc/ghi được
alter table public.docs enable row level security;
drop policy if exists docs_rw on public.docs;
create policy docs_rw on public.docs for all to authenticated
  using ((select public.is_allowed())) with check ((select public.is_allowed()));
revoke all on public.docs from anon;

-- (4) Cập nhật một phần dữ liệu (gộp trường mới vào trường cũ)
create or replace function public.docs_merge(p_coll text, p_id text, p_patch jsonb) returns void
language sql security invoker set search_path = public as $$
  insert into public.docs (coll, id, data) values (p_coll, p_id, p_patch)
  on conflict (coll, id) do update set data = public.docs.data || excluded.data;
$$;
revoke all on function public.docs_merge(text, text, jsonb) from anon, public;
grant execute on function public.docs_merge(text, text, jsonb) to authenticated;

-- (5) Đồng bộ trực tiếp giữa các máy (Realtime)
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- (6) Bảng xem nhanh dạng Excel (Table Editor → chọn view → Export to CSV)
create or replace view public.v_don_hang with (security_invoker = true) as
select day                                                            as ngay,
       to_char((data->>'createdAt')::timestamptz at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI') as gio,
       (select string_agg((i->>'name') || ' x' || (i->>'qty'), ', ')
          from jsonb_array_elements(data->'items') i)                 as mon,
       (data->>'total')::numeric                                      as tong_tien,
       (data->>'cost')::numeric                                       as gia_von,
       case data->>'pay' when 'transfer' then 'Chuyển khoản' else 'Tiền mặt' end as thanh_toan,
       case data->>'channel' when 'away' then 'Mang đi' when 'ship' then 'Giao hàng' else 'Tại quán' end as hinh_thuc,
       case coalesce(data->>'status','ok') when 'void' then 'Đã hủy' when 'deleted' then 'Đã xóa' else 'Hoàn tất' end as trang_thai,
       id
from public.docs where coll = 'orders';

create or replace view public.v_thu_chi with (security_invoker = true) as
select day                                                as ngay,
       case data->>'type' when 'in' then 'Thu' else 'Chi' end as loai,
       data->>'cat'                                       as danh_muc,
       (data->>'amount')::numeric                         as so_tien,
       case data->>'pay' when 'transfer' then 'Chuyển khoản' else 'Tiền mặt' end as tra_bang,
       data->>'note'                                      as ghi_chu,
       id
from public.docs where coll = 'txns';

create or replace view public.v_doanh_thu_ngay with (security_invoker = true) as
select day as ngay,
       count(*)                                  as so_don,
       sum((data->>'total')::numeric)            as doanh_thu,
       sum((data->>'cost')::numeric)             as gia_von,
       sum(case when data->>'pay' = 'transfer' then (data->>'total')::numeric else 0 end) as chuyen_khoan,
       sum(case when data->>'pay' = 'transfer' then 0 else (data->>'total')::numeric end) as tien_mat
from public.docs
where coll = 'orders' and coalesce(data->>'status','ok') = 'ok'
group by day order by day desc;

revoke all on public.v_don_hang, public.v_thu_chi, public.v_doanh_thu_ngay from anon;

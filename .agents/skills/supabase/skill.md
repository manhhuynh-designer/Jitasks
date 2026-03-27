# SKILL: Supabase MCP — Tương tác & Chỉnh sửa Dữ liệu

## Mục đích

Skill này hướng dẫn AI agent sử dụng MCP Supabase để đọc, ghi, cập nhật và xóa dữ liệu trong database. Mọi thao tác phải đảm bảo **bảo mật**, **nhất quán dữ liệu**, và **cảnh báo người dùng trước khi thực hiện bất kỳ thay đổi nào**.

---

## Khi nào kích hoạt Skill này

Kích hoạt khi người dùng yêu cầu một trong các hành động sau liên quan đến Supabase:

- Xem cấu trúc bảng, schema, hoặc dữ liệu hiện tại
- Thêm hàng (`INSERT`), sửa hàng (`UPDATE`), xóa hàng (`DELETE`)
- Tạo, sửa đổi hoặc xóa bảng / cột (`DDL`)
- Chạy migration hoặc seed dữ liệu
- Thiết lập hoặc thay đổi Row Level Security (RLS), policy, role
- Tìm kiếm lỗi hoặc debug query liên quan đến Supabase

---

## Nguyên tắc cốt lõi

### 1. Không bao giờ thay đổi dữ liệu mà không có xác nhận

Trước khi thực thi bất kỳ lệnh `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, hoặc `TRUNCATE` nào, agent **bắt buộc** phải:

1. Hiển thị rõ ràng thao tác sắp thực hiện (bảng nào, điều kiện nào, dữ liệu gì).
2. Ước tính số hàng bị ảnh hưởng (nếu có thể).
3. Yêu cầu người dùng xác nhận bằng lời (`"Bạn có chắc chắn muốn tiếp tục không?"`) hoặc qua tool input.
4. Chỉ thực thi sau khi nhận được xác nhận rõ ràng.

> ⚠️ **Không được tự ý thực thi thay đổi dữ liệu dù người dùng nói "cứ làm đi" một cách mơ hồ. Luôn hiển thị preview trước.**

---

### 2. Luôn đọc trước khi ghi

Trước mỗi thao tác ghi, agent phải:

- Query để hiểu cấu trúc bảng hiện tại (columns, types, constraints, foreign keys).
- Kiểm tra các hàng liên quan sẽ bị ảnh hưởng bởi thay đổi.
- Xác nhận không có ràng buộc (`NOT NULL`, `UNIQUE`, `FK`) nào bị vi phạm.

```
Quy trình chuẩn:
  READ schema → READ affected rows → PREVIEW change → CONFIRM → EXECUTE
```

---

### 3. Phân loại rủi ro và cảnh báo tương ứng

| Hành động | Mức rủi ro | Yêu cầu xác nhận |
|---|---|---|
| `SELECT` | 🟢 Thấp | Không cần |
| `INSERT` (1 hàng) | 🟡 Trung bình | Hiển thị preview |
| `INSERT` (nhiều hàng / bulk) | 🟠 Cao | Preview + xác nhận |
| `UPDATE` có `WHERE` hẹp | 🟡 Trung bình | Hiển thị số hàng + preview |
| `UPDATE` không có `WHERE` | 🔴 Nguy hiểm | **Cảnh báo đỏ + xác nhận bắt buộc** |
| `DELETE` có `WHERE` | 🟠 Cao | Hiển thị hàng bị xóa + xác nhận |
| `DELETE` không có `WHERE` | 🔴 Nguy hiểm | **Từ chối thực thi, yêu cầu viết lại query** |
| `DROP TABLE / COLUMN` | 🔴 Nguy hiểm | **Cảnh báo đỏ + nhắc backup + xác nhận** |
| `TRUNCATE` | 🔴 Nguy hiểm | **Cảnh báo đỏ + xác nhận bắt buộc** |
| Thay đổi RLS / Policy | 🔴 Nguy hiểm | **Cảnh báo bảo mật + xác nhận** |

---

### 4. Bảo mật tuyệt đối

- **Không bao giờ** log hoặc hiển thị `service_role` key, `anon` key, hoặc bất kỳ secret nào ra output.
- Không hardcode credentials vào query hoặc file.
- Khi đề xuất thay đổi RLS hoặc policy, giải thích rõ tác động bảo mật trước khi thực thi.
- Nếu phát hiện bảng nhạy cảm (users, auth, payments, secrets...), tăng mức cảnh báo lên 🔴 bất kể thao tác.
- Ưu tiên dùng `Row Level Security` thay vì kiểm soát truy cập ở tầng application.

---

### 5. Nhất quán dữ liệu (Data Consistency)

- Nhóm các thay đổi liên quan vào một **transaction** khi có thể.
- Nếu MCP không hỗ trợ transaction trực tiếp, hãy thực thi tuần tự và rollback thủ công nếu bước nào thất bại (thông báo rõ bước nào đã thành công, bước nào chưa).
- Không để database ở trạng thái inconsistent: nếu một bước thất bại, phải báo cáo đầy đủ và gợi ý cách khôi phục.

---

## Quy trình thực hiện chi tiết

### A. Thao tác READ (SELECT)

```
1. Gọi MCP tool: list_tables hoặc execute_sql với SELECT
2. Format kết quả dạng bảng cho người dùng dễ đọc
3. Nếu kết quả > 50 hàng: hỏi người dùng có muốn giới hạn không
4. Không cần xác nhận
```

**Ví dụ output tốt:**
```
📋 Kết quả query từ bảng `orders` (5 hàng):

| id | user_id | status  | total   | created_at          |
|----|---------|---------|---------|---------------------|
| 1  | u_001   | pending | 150,000 | 2024-01-15 09:00:00 |
...
```

---

### B. Thao tác WRITE (INSERT / UPDATE / DELETE)

```
1. Đọc schema bảng liên quan
2. Xây dựng câu query
3. Hiển thị PREVIEW rõ ràng (xem mẫu bên dưới)
4. Chờ xác nhận người dùng
5. Thực thi
6. Xác nhận kết quả (số hàng bị ảnh hưởng)
7. Gợi ý kiểm tra lại nếu cần
```

**Mẫu cảnh báo bắt buộc trước khi ghi:**

```
⚠️  CẢNH BÁO THAY ĐỔI DỮ LIỆU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hành động  : UPDATE
Bảng       : public.products
Điều kiện  : WHERE category = 'flash_sale'
Ảnh hưởng  : ~12 hàng (ước tính)
Thay đổi   : discount_pct = 50

Dữ liệu sẽ bị thay đổi:
  [id: 34] "Áo thun basic"  discount: 0% → 50%
  [id: 67] "Quần jeans slim" discount: 10% → 50%
  ... (và 10 hàng khác)

Bạn có chắc chắn muốn tiếp tục? (yes / no)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### C. Thao tác DDL (ALTER / DROP / CREATE TABLE)

```
1. Hiển thị cấu trúc hiện tại của bảng/cột liên quan
2. Hiển thị thay đổi dạng DIFF (trước / sau)
3. Cảnh báo đỏ về tính không thể hoàn tác (DROP, ALTER TYPE...)
4. Nhắc nhở người dùng backup nếu thao tác là DROP hoặc TRUNCATE
5. Chờ xác nhận
6. Thực thi và báo kết quả
```

**Mẫu cảnh báo DDL:**

```
🔴  CẢNH BÁO NGUY HIỂM — THAO TÁC KHÔNG THỂ HOÀN TÁC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hành động  : DROP COLUMN
Bảng       : public.users
Cột bị xóa : legacy_token (text, nullable)

⚠️  Toàn bộ dữ liệu trong cột này sẽ mất vĩnh viễn.
    Hãy đảm bảo bạn đã backup hoặc không cần dữ liệu này nữa.

Khuyến nghị: Chạy lệnh sau để backup trước:
  COPY (SELECT id, legacy_token FROM users WHERE legacy_token IS NOT NULL)
  TO '/tmp/legacy_token_backup.csv' CSV HEADER;

Bạn có chắc chắn muốn tiếp tục? (yes / no)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### D. Thay đổi RLS / Policy / Role

```
1. Hiển thị policy hiện tại của bảng liên quan
2. Giải thích tác động bảo mật của thay đổi
3. Kiểm tra xem thay đổi có mở rộng quyền truy cập không mong muốn không
4. Cảnh báo bảo mật rõ ràng
5. Chờ xác nhận
6. Thực thi và kiểm tra lại policy sau khi áp dụng
```

---

## Xử lý lỗi

Khi MCP trả về lỗi, agent phải:

1. **Không tự ý retry** mà không thông báo người dùng.
2. Phân tích nguyên nhân lỗi (constraint violation, permission denied, connection error...).
3. Trình bày lỗi rõ ràng và đề xuất cách khắc phục cụ thể.
4. Nếu một phần thay đổi đã được thực thi trước khi lỗi xảy ra, liệt kê rõ những gì đã thay đổi để người dùng biết trạng thái hiện tại.

**Mẫu báo cáo lỗi:**

```
❌ Thực thi thất bại
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lỗi       : duplicate key value violates unique constraint "users_email_key"
Chi tiết   : Giá trị email 'test@example.com' đã tồn tại trong bảng users.
Đã thực thi: 0 / 3 bước (không có thay đổi nào được áp dụng)

Gợi ý khắc phục:
  1. Kiểm tra email đã tồn tại: SELECT * FROM users WHERE email = 'test@example.com';
  2. Dùng INSERT ... ON CONFLICT DO NOTHING nếu muốn bỏ qua duplicate.
  3. Dùng INSERT ... ON CONFLICT DO UPDATE nếu muốn upsert.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Các MCP Tools Supabase thường dùng

| Tool | Mục đích | Mức rủi ro |
|---|---|---|
| `list_tables` | Liệt kê bảng và schema | 🟢 |
| `execute_sql` (SELECT) | Đọc dữ liệu | 🟢 |
| `execute_sql` (INSERT) | Thêm dữ liệu | 🟡–🟠 |
| `execute_sql` (UPDATE) | Cập nhật dữ liệu | 🟡–🔴 |
| `execute_sql` (DELETE) | Xóa dữ liệu | 🟠–🔴 |
| `execute_sql` (DDL) | Thay đổi cấu trúc | 🔴 |
| `apply_migration` | Chạy migration file | 🔴 |
| `get_logs` | Xem log hệ thống | 🟢 |

> Agent phải map đúng tool với từng thao tác và không dùng `execute_sql` để thực hiện DDL khi có tool chuyên dụng hơn.

---

## Checklist nhanh trước mỗi thao tác

Trước khi gọi bất kỳ MCP tool nào có thể thay đổi dữ liệu, agent tự kiểm tra:

- [ ] Đã đọc schema bảng liên quan chưa?
- [ ] Đã preview câu query và dữ liệu bị ảnh hưởng chưa?
- [ ] Đã phân loại mức rủi ro theo bảng trên chưa?
- [ ] Đã hiển thị cảnh báo phù hợp với mức rủi ro chưa?
- [ ] Đã nhận được xác nhận rõ ràng từ người dùng chưa?
- [ ] Có cần gộp vào transaction không?
- [ ] Sau khi thực thi, đã xác nhận kết quả và báo cáo cho người dùng chưa?
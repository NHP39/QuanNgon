# Quán Ngon

Quán Ngon là ứng dụng chia sẻ, tìm kiếm và đánh giá quán ăn. Người dùng có thể khám phá địa điểm ăn uống, chia sẻ quán yêu thích và tham khảo đánh giá từ cộng đồng. Admin quản lý bài đăng, người dùng và danh mục.

## Chức năng chính

**Người dùng**

- Đăng ký, xác thực email bằng OTP, đăng nhập, đổi và đặt lại mật khẩu.
- Tìm kiếm quán ăn có dấu/không dấu; lọc theo danh mục và tỉnh/thành phố.
- Khám phá quán có điểm đánh giá cao, xem thông tin và hình ảnh quán.
- Đăng quán; quản lý, chỉnh sửa quán đang chờ duyệt; ẩn/bỏ ẩn và xóa quán mình chia sẻ.
- Gửi, chỉnh sửa và xóa đánh giá của mình, kèm hình ảnh.
- Lưu quán yêu thích và cập nhật thông tin tài khoản.

**Admin**

- Thống kê người dùng đăng ký mới, bài đăng mới và số quán theo trạng thái.
- Xem, tìm kiếm và duyệt/từ chối bài đăng; ghi nhận lý do từ chối.
- Tìm kiếm, lọc và khóa/mở khóa tài khoản người dùng.
- Thêm, đổi tên và xóa danh mục chưa được sử dụng.

## Công nghệ sử dụng

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | React, Vite, Lucide React |
| Backend | Java, Spring Boot, Spring Data JPA / Hibernate |
| Xác thực và phân quyền | Spring Security, JWT, BCrypt, OTP qua email |
| Cơ sở dữ liệu | PostgreSQL, extension `unaccent` |
| OTP, cache và giới hạn request | Redis |
| Lưu trữ hình ảnh | Cloudinary |
| Tài liệu API | OpenAPI, Swagger UI |

## Cấu trúc thư mục

```text
QuanNgon/
├── frontend/                 # Giao diện React và các hàm gọi API
├── src/main/java/ute/phuc/quanngon/
│   ├── controller/           # REST API
│   ├── service/              # Xử lý nghiệp vụ
│   ├── repository/           # Truy vấn dữ liệu
│   ├── entity/               # Ánh xạ bảng PostgreSQL
│   ├── dto/                  # Dữ liệu request/response
│   ├── security/             # JWT và phân quyền
│   └── ...                   # Cấu hình, xử lý lỗi, logging, validation
├── src/main/resources/       # Cấu hình ứng dụng
├── database/                 # Script tạo schema và dữ liệu mẫu
├── .env.example              # Mẫu biến môi trường cho BE
└── pom.xml                   # Cấu hình Maven và thư viện BE
```

## Hướng dẫn chạy local

**Yêu cầu:** Java 21+, Node.js 24, PostgreSQL và Redis. Chuẩn bị thông tin Cloudinary và tài khoản SMTP để dùng chức năng upload ảnh, gửi OTP.

**1. Cấu hình môi trường**

Tại thư mục gốc project, chạy trong CMD:

```cmd
copy .env.example .env
```

Điền kết nối PostgreSQL, Redis, Cloudinary, SMTP và hai JWT secret riêng vào `.env`. Mỗi JWT secret cần ít nhất 64 byte UTF-8. Các biến cần thiết được liệt kê trong [`.env.example`](.env.example).

**2. Chuẩn bị database**

Với database mới, tạo database theo `DB_URL`, kết nối bằng pgAdmin rồi chạy lần lượt:

1. [`database/Create_schema.sql`](database/Create_schema.sql) để tạo bảng, ràng buộc và extension cần thiết.
2. [`database/Insert_data_test.sql`](database/Insert_data_test.sql) nếu muốn nạp dữ liệu mẫu.

**File insert sẽ xóa dữ liệu hiện có trước khi nạp mẫu.** Backend dùng `ddl-auto=validate`, nên cần tạo schema trước khi khởi động lần đầu.

**3. Chạy backend**

Đảm bảo PostgreSQL và Redis có thể kết nối theo `.env`, sau đó chạy tại thư mục gốc:

```cmd
mvnw.cmd spring-boot:run "-Dspring-boot.run.arguments=--spring.config.import=file:.env[.properties]"
```

**4. Chạy frontend**

Mở CMD khác tại thư mục gốc:

```cmd
cd frontend
npm ci
npm run dev
```

FE mặc định gọi `http://localhost:8080/api`. Nếu BE dùng địa chỉ khác, tạo `frontend/.env.local` từ [`frontend/.env.example`](frontend/.env.example), chỉnh `VITE_API_BASE_URL` rồi khởi động lại FE. Cập nhật `APP_ALLOWED_ORIGINS` ở BE nếu đổi địa chỉ/cổng FE.

| Dịch vụ | Địa chỉ mặc định |
| --- | --- |
| Website | http://localhost:5173 |
| API | http://localhost:8080/api |
| Swagger UI | http://localhost:8080/swagger-ui.html |

**Tài khoản ADMIN mẫu** — có sau khi chạy file insert:

- Email: `admin@quanngon.test`
- Mật khẩu: `QuanNgon@Test2026`

Để thử API cần đăng nhập trên Swagger, gọi `POST /api/auth/login` trước; trình duyệt sẽ gửi cookie ở các request tiếp theo.

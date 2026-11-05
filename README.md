# Quán Ngon

Ứng dụng chia sẻ, tìm kiếm và đánh giá quán ăn, xây dựng bằng React/Vite và Spring Boot. Dữ liệu lưu trong PostgreSQL, Redis dùng cho OTP/cache và ảnh lưu trên Cloudinary.

## Chạy local

Chuẩn bị Java 21+, Node.js 24, PostgreSQL và Redis.

1. Tạo database, chạy `database/Create_schema.sql` trong pgAdmin. Có thể chạy thêm `database/Insert_data_test.sql` để nạp mẫu; file này xóa dữ liệu hiện có.
2. Chạy `copy .env.example .env` trong CMD ở thư mục gốc, điền cấu hình DB, Redis, Cloudinary, SMTP và hai JWT secret riêng (mỗi secret ít nhất 64 byte).
3. Khởi động PostgreSQL và Redis, sau đó chạy BE:

```cmd
mvnw.cmd spring-boot:run "-Dspring-boot.run.arguments=--spring.config.import=file:.env[.properties]"
```

Mở CMD khác để chạy FE:

```cmd
cd frontend
npm ci
npm run dev
```

- Website: http://localhost:5173
- API: http://localhost:8080/api
- Swagger: http://localhost:8080/swagger-ui.html

FE mặc định gọi API tại `http://localhost:8080/api`. Nếu BE dùng địa chỉ khác, tạo `frontend/.env.local` từ `frontend/.env.example`, chỉnh `VITE_API_BASE_URL` rồi khởi động lại FE.

Thử API cần đăng nhập: gọi `/api/auth/login` trên Swagger trước; trình duyệt tự gửi cookie ở các request tiếp theo.

## Chạy bằng Docker

Tạo `.env.docker` từ `.env`. Nếu DB/Redis chạy trên máy host, dùng `host.docker.internal` thay `localhost`.

```cmd
docker build -t quanngon:local .
docker run --rm -p 8080:8080 --env-file .env.docker -e APP_COOKIE_SECURE=false -e APP_COOKIE_SAME_SITE=Lax -e APP_REQUIRE_HTTPS=false -e FORWARD_HEADERS_STRATEGY=none quanngon:local
```

Docker chỉ chạy BE tại http://localhost:8080/api. Project dùng một `application.properties`; local và hosting nhận giá trị khác nhau qua biến môi trường.

Log BE ghi ra console; trên Azure xem trong App Service → Monitoring → Log stream sau khi bật App Service logs. Mỗi request API có `X-Request-ID` trong response để đối chiếu với `requestId` trong log. Các biến `LOG_LEVEL_ROOT`, `LOG_LEVEL_APP`, `LOG_LEVEL_HTTP` mặc định `INFO`; đặt `LOG_LEVEL_HTTP=WARN` để chỉ giữ dòng tổng kết request lỗi 5xx. Các chỗ bổ sung logging trong code được đánh dấu bằng comment `Logging:`.

## Vercel, Azure và Redis Cloud

- **Vercel:** chọn Root Directory `frontend`, build `npm run build`, output `dist`; đặt `VITE_API_BASE_URL=https://<BE>.azurewebsites.net/api`. Đã có `vercel.json` hỗ trợ tải lại các đường dẫn FE.
- **Azure:** khai báo các biến DB, JWT, Cloudinary, SMTP trong `.env.example`; đặt `APP_ALLOWED_ORIGINS=https://<FE>.vercel.app`, `APP_COOKIE_SECURE=true`, `APP_COOKIE_SAME_SITE=None`, `APP_REQUIRE_HTTPS=true`, `FORWARD_HEADERS_STRATEGY=framework`. Nếu dùng Docker trên App Service, cấu hình cổng container 8080.
- **Redis Cloud:** đặt `REDIS_URL` theo connection URL nhà cung cấp; dùng `rediss://default:<password>@<host>:<port>` khi database bật TLS. URL-encode phần password nếu có ký tự đặc biệt.

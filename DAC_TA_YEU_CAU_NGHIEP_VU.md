# ĐẶC TẢ NGHIỆP VỤ VÀ CHỨC NĂNG — QUÁN NGON

| Thông tin | Giá trị |
| --- | --- |
| Dự án | Quán Ngon — ứng dụng khám phá, chia sẻ và đánh giá quán ăn |
| Phiên bản tài liệu | 2.0 |
| Ngày cập nhật | 04/11/2026 |
| Căn cứ | Mã nguồn FE, BE, cấu hình và schema trong project |
| Phạm vi | Các màn hình, phân quyền, quy tắc nghiệp vụ và thành phần kỹ thuật đang được triển khai |

## 1. Tổng quan và phạm vi

Quán Ngon giúp người dùng tìm địa điểm ăn uống, xem thông tin và đánh giá của cộng đồng, chia sẻ quán và lưu quán yêu thích. Quản trị viên kiểm duyệt bài đăng, quản lý người dùng, danh mục và xem thống kê.

Các màn hình nghiệp vụ trong tài liệu đã có FE gọi API BE. Dữ liệu nghiệp vụ được lưu ở PostgreSQL; giao diện không dùng dữ liệu giả hoặc localStorage thay cho API. File `database/Insert_data_test.sql` là dữ liệu khởi tạo phục vụ chạy thử, không phải một chế độ giao diện riêng.

Tài liệu mô tả chức năng hiện có trong mã nguồn, không xác nhận hệ thống đã được triển khai lên hosting. Hướng dẫn chạy và cấu hình triển khai nằm trong [README.md](README.md). Chi tiết request/response của API được cung cấp qua Swagger từ mã nguồn controller và DTO.

Ngoài phạm vi: đặt bàn, đặt món, giao hàng, thanh toán, quản lý thực đơn, doanh thu, báo cáo bài đăng và quản lý thông báo.

## 2. Người dùng và phân quyền

Hệ thống có hai vai trò tài khoản: `USER` và `ADMIN`. Khách chưa đăng nhập không phải một vai trò lưu trong DB.

“Người đăng quán” là người tạo bài giới thiệu quán; người này có thể là chủ quán hoặc người chia sẻ địa điểm. Đây là quan hệ sở hữu bài đăng, không phải vai trò tài khoản riêng.

| Chức năng | Khách | USER | ADMIN |
| --- | --- | --- | --- |
| Xem Trang chủ, Khám phá, chi tiết và đánh giá quán công khai | Có | Có | Có |
| Đăng ký, xác thực email, đăng nhập | Có | Theo luồng tài khoản | Đăng nhập bằng tài khoản được cấp |
| Xem/sửa thông tin cá nhân, đổi mật khẩu, đăng xuất | Không | Tài khoản của mình | Tài khoản của mình |
| Đăng quán | Không | Có | Có |
| Xem, sửa, ẩn/bỏ ẩn và xóa quán đã chia sẻ | Không | Bài đăng của mình, theo điều kiện trạng thái | Bài đăng của mình, theo điều kiện trạng thái |
| Gửi, sửa và xóa đánh giá | Không | Đánh giá của mình | Đánh giá của mình |
| Thêm/bỏ và xem danh sách yêu thích | Không | Danh sách của mình | Danh sách của mình |
| Quản lý bài đăng, người dùng, danh mục và xem thống kê | Không | Không | Có |

ADMIN sử dụng được các chức năng của thành viên và có thêm nút Quản lý trên header để vào khu vực quản trị. Các API `/api/admin/**` yêu cầu quyền ADMIN; các chức năng cá nhân yêu cầu phiên đăng nhập hợp lệ. FE điều khiển hiển thị giao diện, BE kiểm tra quyền và chủ sở hữu dữ liệu.

Đăng ký công khai chỉ tạo tài khoản USER. Tài khoản ADMIN được cấp trực tiếp qua SQL, không có chức năng tạo ADMIN trên giao diện. Thông tin đăng nhập riêng không được ghi trong tài liệu.

## 3. Chức năng theo màn hình

### 3.1. Trang chủ — `/`, `/home`

- Hiển thị lời giới thiệu có hiệu ứng gõ từng ký tự, giữ nội dung rồi mờ dần và lặp lại.
- Tìm kiếm quán, chuyển sang Khám phá với từ khóa đã nhập.
- Hiển thị tối đa ba quán APPROVED có điểm trung bình cao nhất và đã có đánh giá.
- Dùng card chung với Khám phá, có trạng thái yêu thích theo tài khoản đang đăng nhập.
- Click card mở chi tiết quán. Trang chủ không có khu vực danh mục.

### 3.2. Khám phá — `/explore`

- Lấy danh sách quán APPROVED, tìm theo tên hoặc nội dung, không phân biệt hoa/thường.
- Kết hợp bộ lọc danh mục và tỉnh/thành phố; không có bộ lọc số sao.
- Danh sách danh mục lấy từ BE. Danh sách tỉnh/thành chỉ gồm các giá trị địa chỉ của quán APPROVED.
- Chọn bộ lọc là áp dụng ngay và trở về trang đầu; nút Xóa bộ lọc dùng để đặt lại điều kiện.
- Tiêu đề là “Tất cả quán ăn”; khi chọn tỉnh/thành thì bổ sung “tại ...”.
- Danh sách mặc định xếp quán mới tạo trước, có phân trang và trạng thái yêu thích riêng của người gọi.
- Card hiển thị ảnh, tên, điểm/số đánh giá, tên danh mục và địa chỉ phường/xã + tỉnh/thành trên dòng riêng.

### 3.3. Đăng nhập, đăng ký và OTP — `/login`, `/verify-otp`

- Đăng ký bằng họ tên, email, mật khẩu và xác nhận mật khẩu; mật khẩu từ 8–64 ký tự.
- Gửi OTP sáu chữ số qua email. Phải xác thực email trước khi đăng nhập; OTP mặc định có hiệu lực 300 giây theo cấu hình.
- Cho phép gửi lại OTP, có thời gian chờ và giới hạn số request.
- Đăng nhập bằng email/mật khẩu; tài khoản bị khóa hoặc chưa xác thực email không được đăng nhập.
- Đăng nhập thành công chuyển về Trang chủ cho cả USER và ADMIN.
- Thông báo đổi mật khẩu thành công chỉ dùng cho lần quay về đăng nhập; lỗi đăng nhập mới thay thế thông báo thành công cũ.

#### Quên mật khẩu — `/forgot-password`, `/reset-password`

- Từ trang Đăng nhập, chọn Quên mật khẩu và nhập email đã đăng ký. Email sai định dạng trả 400; email chưa đăng ký trả 404 với thông báo riêng.
- BE kiểm tra tài khoản đang hoạt động, đã xác thực email rồi giao việc tạo/gửi OTP cho AsyncTaskExecutor. Response thành công thể hiện đã tiếp nhận yêu cầu; lỗi gửi email ở nền được ghi log cùng requestId.
- OTP sáu chữ số được băm trước khi lưu trong Redis với khóa riêng password-reset:otp, thời hạn theo OtpProperties. OTP đăng ký không dùng để đặt lại mật khẩu.
- FE cho nhập OTP, mật khẩu mới và xác nhận, có thời gian hiệu lực và gửi lại mã. Việc gửi lại dùng cùng API yêu cầu mã, chờ tối thiểu 60 giây; BE giới hạn gửi/xác minh theo email và IP bằng bộ đếm riêng với đăng ký.
- BE kiểm tra xác nhận, email/trạng thái tài khoản và kiểm tra/xóa OTP nguyên tử. Mã đã dùng hoặc hết hạn trả 400; hai request dùng cùng mã chỉ có một request được sử dụng mã thành công.
- Đặt lại mật khẩu lưu BCrypt, tăng sessionVersion và xóa refresh token trong transaction; không tự đăng nhập hoặc xóa cookie. Sau thành công FE chuyển về Đăng nhập, điền sẵn email và hiển thị thông báo.
- Redis và DB không dùng chung transaction. OTP được tiêu thụ trước khi cập nhật DB; nếu cập nhật thất bại, người dùng cần yêu cầu OTP mới, mật khẩu cũ được giữ theo rollback DB.
- FE chỉ lưu email và mốc thời gian trong sessionStorage, không lưu OTP hoặc mật khẩu. Chức năng này không yêu cầu đổi Entity/schema.

### 3.4. Đăng quán — `/eateries/new`

- Nhập tên, số điện thoại liên hệ của quán, danh mục, nội dung và địa chỉ.
- Thứ tự địa chỉ: Tỉnh/Thành phố → Phường/Xã → Đường. Không có trường quận/huyện.
- FE lấy tỉnh và phường/xã từ Province Open API v2; đường do người dùng nhập.
- Nếu API địa chỉ lỗi, dữ liệu không hợp lệ hoặc quá hai giây, cả phần tỉnh và phường/xã chuyển sang nhập tay. Không yêu cầu người dùng bật chế độ thủ công, không hiện thông báo lỗi địa chỉ hoặc nút Thử lại.
- Bắt buộc một Ảnh đại diện; cho phép tối đa sáu Ảnh của quán. Hai khu vực ảnh nằm trên các hàng riêng, có xem trước.
- Gửi dữ liệu và ảnh bằng multipart; ảnh được lưu trên Cloudinary, thông tin quán được lưu ở PostgreSQL.
- Bài đăng mới có trạng thái PENDING và chỉ công khai sau khi được duyệt.

### 3.5. Chi tiết quán — `/eateries/{id}`

- Chỉ công khai quán APPROVED; quán không tồn tại hoặc không công khai trả 404.
- Hiển thị tên, số điện thoại liên hệ, nội dung, danh mục, địa chỉ và ảnh; ảnh đại diện đứng trước các ảnh khác.
- Hiển thị điểm trung bình, tổng số đánh giá và điểm trung bình của bốn tiêu chí.
- Lấy đánh giá của người đang đăng nhập bằng API riêng để ghim và làm nổi bật; không lấy lại đánh giá này khi tải trang đánh giá tiếp theo.
- Các đánh giá còn lại được phân trang; FE dùng nút Xem thêm, hỗ trợ xếp mới nhất, điểm cao nhất hoặc thấp nhất.
- Cho phép gửi, sửa và xóa đánh giá của mình theo quy tắc tại mục 4.3.

### 3.6. Quản lý tài khoản — `/account`

- Hiển thị thông tin tài khoản đang đăng nhập; cho phép cập nhật họ tên qua API.
- Email và vai trò được hiển thị, không được thay đổi qua chức năng sửa thông tin.
- Không lưu số điện thoại trong tài khoản. Số điện thoại liên hệ của quán là dữ liệu riêng của bài đăng.
- Menu tài khoản dẫn tới thông tin cá nhân, đổi mật khẩu, quán đã chia sẻ, quán yêu thích và đăng xuất.

### 3.7. Đổi mật khẩu — `/account/password`

- Dùng chung cho USER và ADMIN; không có form đổi mật khẩu riêng trong khu vực quản trị.
- Nhập mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu mới.
- FE kiểm tra bắt buộc nhập và độ dài; vẫn gửi API khi xác nhận chưa khớp để BE xử lý thứ tự lỗi.
- BE lần lượt kiểm tra mật khẩu hiện tại, mật khẩu mới khác mật khẩu cũ và xác nhận khớp mật khẩu mới. Mật khẩu mới từ 8–64 ký tự.
- Khi đổi thành công, vô hiệu hóa phiên cũ và xóa cookie sau khi transaction commit; người dùng phải đăng nhập lại.
- Đường dẫn cũ `/admin/password` chuyển về `/account/password`.

### 3.8. Quán đã chia sẻ — `/account/eateries`

- Lấy các quán của người đang đăng nhập, có phân trang và lọc theo trạng thái; không có tìm kiếm.
- Sắp xếp theo thời gian cập nhật mới nhất, sau đó theo ID giảm dần.
- Có API chi tiết riêng của người đăng để tải dữ liệu sửa quán, kể cả khi bài chưa công khai.
- Chỉ sửa nội dung và ảnh khi PENDING. Form sửa dùng chung cách nhập địa chỉ và xử lý ảnh với form đăng quán.
- Người đăng được Ẩn/Bỏ ẩn quán theo APPROVED ↔ HIDDEN.
- Được xóa quán của mình, kể cả quán đã có đánh giá; dữ liệu liên quan được xử lý theo quan hệ trong schema và service.
- Các thao tác sửa, ẩn/bỏ ẩn gửi version để phát hiện dữ liệu cũ.
- Nhóm nút thao tác nằm dọc bên phải card trên màn hình lớn và chuyển xuống cuối card trên điện thoại.

### 3.9. Quán yêu thích — `/account/favorites`

- Thêm/bỏ yêu thích và lấy danh sách bằng API; dùng card chung với Khám phá.
- Mỗi người dùng chỉ có một bản ghi yêu thích cho một quán; gọi lại thao tác thêm không tạo bản ghi trùng.
- Chỉ thêm và hiển thị quán APPROVED. Khi quán bị ẩn, liên kết yêu thích vẫn được giữ và quán không xuất hiện trong danh sách cho tới khi công khai lại.
- API bỏ yêu thích vẫn xử lý được nếu quán đã ẩn hoặc liên kết không còn tồn tại.
- Danh sách mặc định sáu card/trang, sắp xếp lần thêm gần nhất trước theo ID bản ghi yêu thích. Favorite không có createdAt.

### 3.10. Admin — Tổng quan — `/admin`, `/admin/overview`

- Biểu đồ người đăng ký mới: chỉ đếm tài khoản USER đã xác thực email, gom theo ngày tạo tài khoản.
- Biểu đồ tình trạng quán: tổng số quán và số lượng theo PENDING, APPROVED, REJECTED, HIDDEN.
- Biểu đồ bài đăng mới: số quán được tạo theo ngày, không giới hạn ở trạng thái APPROVED.
- Hai biểu đồ theo thời gian nhận khoảng 7, 30 hoặc 90 ngày, mặc định 30; tính cả hôm nay và bổ sung 0 cho ngày không có dữ liệu.
- Dùng múi giờ `STATISTICS_TIME_ZONE`, mặc định `Asia/Ho_Chi_Minh`. DB gom nhóm bằng native SQL PostgreSQL; service tạo chuỗi ngày đầy đủ.

### 3.11. Admin — Quản lý bài đăng — `/admin/eateries`

- Bốn tab tương ứng bốn trạng thái, có tổng số quán từng trạng thái, tìm kiếm tên/nội dung và phân trang.
- Tìm kiếm chỉ áp dụng trong trạng thái đang chọn; counts phản ánh tổng số quán của bốn trạng thái, không phụ thuộc từ khóa.
- PENDING có Duyệt/Từ chối; REJECTED có Duyệt. APPROVED và HIDDEN không có thao tác đổi trạng thái của Admin.
- Nút Xem chi tiết thay cho menu dấu ba chấm.
- Từ chối yêu cầu lý do sau khi bỏ khoảng trắng đầu/cuối dài 10–500 ký tự. Khi duyệt lại, lý do từ chối được xóa.
- Gửi version khi đổi trạng thái; dữ liệu đã bị người khác thay đổi trả 409 và không ghi đè.

### 3.12. Admin — Quản lý người dùng — `/admin/users`

- Chỉ quản lý tài khoản USER; hiển thị họ tên, email, trạng thái hoạt động và ngày tạo tài khoản.
- Tìm theo họ tên/email, tìm họ tên có hỗ trợ không dấu; lọc tất cả/hoạt động/bị khóa.
- Phân trang và sắp xếp theo ngày tạo tăng hoặc giảm; không có sắp xếp tên A–Z.
- Hiển thị tổng số tài khoản, số hoạt động và số bị khóa; cập nhật lại dữ liệu sau thao tác thành công.
- Khóa/mở khóa tài khoản. Khóa làm mất hiệu lực phiên cũ; mở khóa không khôi phục phiên đó, người dùng phải đăng nhập lại.
- Không có chức năng tạo tài khoản trong màn hình này và không có cột số điện thoại.

### 3.13. Admin — Quản lý danh mục — `/admin/categories`

- Xem danh sách, tìm theo tên, phân trang, thêm, đổi tên và xóa danh mục.
- Hiển thị tên và số quán; có số liệu tổng hợp. Không có cột ngày tạo, trạng thái, bộ lọc sắp xếp hay chức năng ẩn danh mục.
- Tên được chuẩn hóa khoảng trắng; sau chuẩn hóa dài 2–80 ký tự. Kiểm tra trùng không phân biệt hoa/thường, dấu tiếng Việt và khoảng trắng thừa.
- Chỉ xóa danh mục chưa được bất kỳ quán nào sử dụng, xét mọi trạng thái quán.
- Danh mục hiển thị bằng tên, không gán icon riêng cho từng danh mục.

Sidebar Admin dùng chung cho Tổng quan, Quản lý người dùng, Quản lý bài đăng và Quản lý danh mục. Không có mục Quản lý thông báo, Báo cáo hoặc Cài đặt; khối thông tin Admin không có menu xổ xuống Đổi mật khẩu/Đăng xuất.

## 4. Quy tắc dữ liệu và xử lý nghiệp vụ

### 4.1. Trạng thái quán

| Trạng thái hiện tại | Thao tác | Trạng thái mới | Người có quyền |
| --- | --- | --- | --- |
| Chưa tạo | Đăng quán | PENDING | USER hoặc ADMIN đang đăng nhập |
| PENDING | Duyệt | APPROVED | ADMIN |
| PENDING | Từ chối, kèm lý do | REJECTED | ADMIN |
| REJECTED | Duyệt lại, xóa lý do từ chối | APPROVED | ADMIN |
| APPROVED | Ẩn | HIDDEN | Người đăng |
| HIDDEN | Bỏ ẩn | APPROVED | Người đăng |

Các chuyển trạng thái khác không được hỗ trợ. Sửa nội dung khi PENDING giữ nguyên trạng thái PENDING. API riêng của người đăng kiểm tra chủ sở hữu; không cho sửa hoặc xóa quán của tài khoản khác.

### 4.2. Điểm số, địa chỉ và ảnh

- Một đánh giá có bốn điểm nguyên từ 1–5: chất lượng món ăn, phục vụ, không gian và vệ sinh.
- Điểm quán là trung bình bốn tiêu chí trên các đánh giá. Điểm chưa được làm tròn ở BE; FE định dạng khi hiển thị.
- Quán chưa có đánh giá trả averageRating bằng 0 và reviewCount bằng 0; giao diện ghi “Chưa có đánh giá”.
- Top quán xếp điểm trung bình giảm dần, sau đó số đánh giá giảm dần và ID giảm dần; chỉ lấy quán có đánh giá.
- Địa chỉ lưu ba phần street, ward, province. Bộ lọc tỉnh/thành so khớp với province của quán APPROVED, không lấy toàn bộ tỉnh từ API bên ngoài.
- BE chấp nhận ảnh JPEG/JPG, PNG và WEBP, mỗi ảnh tối đa 2 MB. Một quán có một ảnh đại diện và tối đa sáu ảnh bổ sung; một đánh giá tối đa bốn ảnh.
- FE chuẩn hóa ảnh tải lên theo khung 4:3 và dùng cách hiển thị ảnh thống nhất. URL và định danh ảnh Cloudinary được lưu trong DB.
- Service dùng cleanup ảnh đã upload khi transaction rollback; ảnh bị loại bỏ được xóa theo luồng cập nhật/xóa tương ứng.

### 4.3. Đánh giá

- Mỗi người dùng chỉ đánh giá một lần cho một quán; DB có ràng buộc duy nhất theo người gửi và quán.
- Người đăng được đánh giá quán mình chia sẻ, cũng chịu giới hạn một lần.
- Chỉ gửi/sửa/xóa đánh giá của mình trên quán APPROVED; nhận xét sau chuẩn hóa dài 10–1000 ký tự.
- Khi sửa, có thể bỏ ảnh cũ và bổ sung ảnh mới, tổng ảnh còn lại không vượt quá bốn.
- API `/reviews/me` trả 204 nếu chưa có đánh giá; API danh sách phân trang loại đánh giá của người đang đăng nhập để tránh trùng phần ghim. Khách xem danh sách đầy đủ.
- Thay đổi đánh giá làm thay đổi điểm/số đánh giá hiển thị; dữ liệu top quán liên quan được làm mất hiệu lực cache sau commit.

### 4.4. Phân trang và xử lý đồng thời

- Chỉ số page bắt đầu từ 0. PageResponse gồm content, page, size, totalElements và totalPages.
- Mặc định: danh sách quán công khai 8, Admin bài đăng/người dùng 8, Admin danh mục 7, quán đã chia sẻ 10, quán yêu thích 6, đánh giá 5 bản ghi/trang. FE có thể gửi size khác trong giới hạn API.
- Các API danh sách trên giới hạn size từ 1–100; riêng đánh giá từ 1–20. Page phải không âm.
- Eatery dùng optimistic locking qua `@Version`. Sửa quán, ẩn/bỏ ẩn và duyệt/từ chối nhận version từ dữ liệu FE đang giữ.
- BE kiểm tra version trước thao tác; Hibernate tiếp tục kiểm tra khi cập nhật DB. Version không khớp hoặc xung đột khi ghi trả 409 thay vì ghi đè dữ liệu mới.
- createdAt biểu thị thời gian tạo quán; updatedAt biểu thị lần cập nhật quán, không phải ngày tạo lại khi duyệt.

## 5. Xác thực, phiên và Redis

### 5.1. Phiên đăng nhập

- Mật khẩu lưu bằng BCrypt. Access token và refresh token dùng hai secret riêng; thời hạn hiện tại lần lượt là 15 phút và 7 ngày.
- Token được gửi bằng cookie HttpOnly. Cấu hình Secure và SameSite lấy từ biến môi trường để phân biệt local và hosting.
- Refresh token được lưu trong DB và được kiểm tra trước khi cấp access token mới.
- Account có sessionVersion; token mang phiên bản phiên. Đăng nhập mới làm mất hiệu lực phiên trước; thiết bị cũ nhận biết khi gửi request tiếp theo, không phải qua thông báo đẩy tức thì.
- Filter kiểm tra tài khoản hoạt động và phiên bản phiên. Đổi mật khẩu, đăng xuất phiên hiện tại hoặc khóa tài khoản vô hiệu hóa phiên tương ứng; mở khóa không phục hồi token cũ.
- FE có luồng refresh khi access token hết hạn; dữ liệu cá nhân và trạng thái tim luôn dựa trên người được BE xác thực.

### 5.2. OTP và giới hạn request

Redis lưu OTP và dữ liệu giới hạn request. OTP đăng ký và OTP đặt lại mật khẩu dùng khóa riêng. Các mức mặc định được cấu hình trong OtpProperties và AuthRateLimitProperties:

| Nhóm request | Theo email | Theo IP | Khoảng thời gian |
| --- | --- | --- | --- |
| Đăng nhập | 10 | 30 | 15 phút |
| Gửi OTP khi đăng ký/gửi lại | 5 | 20 | 1 giờ, chờ 60 giây giữa các lần gửi theo email |
| Xác thực OTP | 5 | 30 | 5 phút |

Vượt giới hạn trả 429. Email OTP dùng SMTP; không sử dụng dữ liệu cache thay cho tài khoản và trạng thái xác thực trong DB.

### 5.3. Cache dữ liệu

- Cache danh sách danh mục: TTL hiện tại 30 phút.
- Cache ba nhóm thống kê Admin: TTL 60 giây; thống kê theo thời gian dùng khóa chứa múi giờ, ngày hiện tại và số ngày.
- Cache truy vấn top ba quán không có bộ lọc: TTL 5 phút. Chỉ cache dữ liệu chung, sau đó bổ sung trạng thái yêu thích theo người gọi.
- Dùng `@Cacheable` và `@CacheEvict`; các thay đổi nghiệp vụ phát sự kiện để xóa nhóm cache liên quan sau commit.
- Lỗi cache được ghi log và cho phép method tiếp tục lấy dữ liệu DB. Cơ chế này không thay thế Redis trong luồng OTP và giới hạn request.

## 6. Giao diện và xử lý lỗi

- Header/footer được dùng chung trong các trang người dùng; giao diện hỗ trợ máy tính và màn hình nhỏ. Đăng nhập/đăng ký có bố cục riêng.
- Danh mục được hiển thị bằng tên. Card Trang chủ, Khám phá và Quán yêu thích dùng thành phần chung; danh sách quản lý dùng card phù hợp với thao tác quản lý.
- Thành phần lỗi tải trang dùng chung hiển thị “Tạm thời không thể tải trang”, không có icon, header hoặc footer, có nút Thử lại và giữ đường dẫn hiện tại. Một số luồng quản trị còn xử lý lỗi hoặc hết phiên ngay trong khu vực danh sách/hộp thoại.
- Lỗi riêng của một biểu đồ có thể hiển thị tại khu vực biểu đồ. Lỗi gửi form được xử lý trong form, giữ dữ liệu đã nhập; không tự gửi lại thao tác ghi dữ liệu.
- Phân biệt các trường hợp chưa đăng nhập, không có quyền, không tìm thấy, xung đột dữ liệu và vượt giới hạn request.
- Lỗi nghiệp vụ/validation được GlobalExceptionHandler xử lý theo ErrorResponse. Lỗi bị chặn trực tiếp tại Security Filter có thể chỉ trả mã HTTP theo SecurityConfig hiện tại.

### 6.1. Logging và tra cứu lỗi

- BE ghi log ra console bằng SLF4J/Logback; không cấu hình file log riêng trong container.
- Request API được gán UUID do BE tạo, trả qua header X-Request-ID và đưa vào MDC dưới tên requestId. CORS cho phép FE đọc header này.
- Log tổng kết gồm method, đường dẫn không có query string, mã HTTP và thời gian xử lý. Không ghi body, mật khẩu, OTP, cookie hay token vào dòng tổng kết.
- Lỗi Redis/timeout, lỗi SMTP và lỗi hệ thống chưa được xử lý được ghi ERROR kèm stack trace. Các lỗi nghiệp vụ/validation thông thường không ghi stack trace; nguyên nhân kỹ thuật không được đưa vào response lỗi hệ thống chung.
- Mức log điều khiển qua LOG_LEVEL_ROOT, LOG_LEVEL_APP và LOG_LEVEL_HTTP. Mặc định INFO; có thể đặt LOG_LEVEL_HTTP=WARN để chỉ giữ dòng tổng kết request lỗi 5xx.
- Comment Logging: đánh dấu những chỗ bổ sung logging. Chi tiết HTTP và phân quyền của Spring tiếp tục dùng cơ chế xử lý hiện có.

## 7. Thành phần và tài liệu liên quan

| Thành phần | Vai trò |
| --- | --- |
| React/Vite | Giao diện người dùng và Admin, gọi API BE |
| Spring Boot/Spring Security/JPA | API, xác thực, phân quyền, nghiệp vụ và truy cập DB |
| PostgreSQL | Lưu dữ liệu; unaccent hỗ trợ tìm kiếm tên và chuẩn hóa tên danh mục |
| Redis | OTP, giới hạn request, cache danh mục/thống kê/top quán |
| Cloudinary | Lưu trữ và xóa ảnh |
| SMTP | Gửi email OTP |
| Province Open API v2 | Cung cấp lựa chọn tỉnh và phường/xã trong form đăng/sửa quán |

Schema hiện có chín bảng: accounts, users, categories, addresses, eateries, favorites, reviews, images và refresh_tokens. Account lưu createdAt và sessionVersion; Eatery lưu version và rejectionReason. Review liên kết ảnh qua quan hệ dữ liệu, không yêu cầu thêm giá trị REVIEW vào ImageType.

- Hướng dẫn chạy local, Docker và cấu hình hosting: [README.md](README.md).
- Cấu hình BE dùng chung: `src/main/resources/application.properties`; giá trị theo môi trường lấy từ biến môi trường, tham khảo `.env.example`.
- Tạo schema: `database/Create_schema.sql`. Hibernate dùng ddl-auto=validate, không tự tạo schema khi chạy ứng dụng.
- Nạp dữ liệu khởi tạo: `database/Insert_data_test.sql`. Script xóa dữ liệu hiện có trước khi nạp, không phải bước bắt buộc để vận hành với dữ liệu thực.
- Swagger local: http://localhost:8080/swagger-ui.html; OpenAPI JSON: http://localhost:8080/v3/api-docs. Chi tiết endpoint, tham số và DTO xem tại đây thay vì duy trì bảng API trùng trong tài liệu này.
- Mô hình triển khai dự kiến: FE trên Vercel, BE trên Azure, Redis trên Redis Cloud. FE và BE chạy riêng; BE không phục vụ các đường dẫn trang hoặc tài nguyên build FE.

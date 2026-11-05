
-- Sample USER and ADMIN password: QuanNgon@Test2026 (BCrypt).
-- Sample ADMIN email: admin@quanngon.test.

BEGIN;
SET LOCAL search_path TO public;
SET LOCAL TIME ZONE 'Asia/Ho_Chi_Minh';

TRUNCATE TABLE favorites, images, reviews, refresh_tokens, eateries,
    addresses, users, categories, accounts RESTART IDENTITY;

INSERT INTO accounts (id, email, password, role, active, email_verified, created_at)
VALUES
    (1, 'admin@quanngon.test', '$2a$10$XbLZ1Ev3uhKxURIO9T3hX.dJ5F0ZxU/hB3pbMUHPkiiRVetnzK5nK', 'ADMIN', true, true, CURRENT_TIMESTAMP),
    (2, 'phuc@example.com', '$2a$10$XbLZ1Ev3uhKxURIO9T3hX.dJ5F0ZxU/hB3pbMUHPkiiRVetnzK5nK', 'USER', true, true, (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 120) + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    (3, 'minh@example.com', '$2a$10$XbLZ1Ev3uhKxURIO9T3hX.dJ5F0ZxU/hB3pbMUHPkiiRVetnzK5nK', 'USER', true, true, (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 119) + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    (4, 'nam@example.com', '$2a$10$XbLZ1Ev3uhKxURIO9T3hX.dJ5F0ZxU/hB3pbMUHPkiiRVetnzK5nK', 'USER', true, true, (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 118) + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    (5, 'linh@example.com', '$2a$10$XbLZ1Ev3uhKxURIO9T3hX.dJ5F0ZxU/hB3pbMUHPkiiRVetnzK5nK', 'USER', true, true, (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 117) + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    (6, 'an@example.com', '$2a$10$XbLZ1Ev3uhKxURIO9T3hX.dJ5F0ZxU/hB3pbMUHPkiiRVetnzK5nK', 'USER', true, true, (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 116) + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    (7, 'thao@example.com', '$2a$10$XbLZ1Ev3uhKxURIO9T3hX.dJ5F0ZxU/hB3pbMUHPkiiRVetnzK5nK', 'USER', true, true, (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 115) + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    (8, 'huy@example.com', '$2a$10$XbLZ1Ev3uhKxURIO9T3hX.dJ5F0ZxU/hB3pbMUHPkiiRVetnzK5nK', 'USER', true, true, (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 114) + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    (9, 'mai@example.com', '$2a$10$XbLZ1Ev3uhKxURIO9T3hX.dJ5F0ZxU/hB3pbMUHPkiiRVetnzK5nK', 'USER', true, true, (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 113) + TIME '09:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh');

INSERT INTO users (id, full_name, account_id)
VALUES
    (1, 'Quản trị viên', 1),
    (2, 'Nguyễn Hoàng Phúc', 2),
    (3, 'Trần Quốc Minh', 3),
    (4, 'Nguyễn Hoàng Nam', 4),
    (5, 'Lê Ngọc Linh', 5),
    (6, 'Phạm Minh An', 6),
    (7, 'Võ Thanh Thảo', 7),
    (8, 'Đặng Gia Huy', 8),
    (9, 'Bùi Ngọc Mai', 9);

-- Registration fixtures cover day boundaries, empty days and excluded accounts.
WITH registration_fixtures
    (id, email, role, active, email_verified, days_ago, local_time) AS (
    VALUES
        (10, 'dashboard.today.1@example.com', 'USER', true, true, 0, TIME '00:00:00'),
        (11, 'dashboard.today.2@example.com', 'USER', true, true, 0, TIME '00:00:00'),
        (12, 'dashboard.yesterday.start@example.com', 'USER', true, true, 1, TIME '00:00:00'),
        (13, 'dashboard.yesterday.end@example.com', 'USER', true, true, 1, TIME '23:59:59'),
        (14, 'dashboard.day3@example.com', 'USER', true, true, 3, TIME '09:00:00'),
        (15, 'dashboard.day6.start@example.com', 'USER', true, true, 6, TIME '00:00:00'),
        (16, 'dashboard.day6.end@example.com', 'USER', true, true, 6, TIME '23:59:59'),
        (17, 'dashboard.day7@example.com', 'USER', true, true, 7, TIME '09:00:00'),
        (18, 'dashboard.day15@example.com', 'USER', true, true, 15, TIME '09:00:00'),
        (19, 'dashboard.day29.start@example.com', 'USER', true, true, 29, TIME '00:00:00'),
        (20, 'dashboard.day29.end@example.com', 'USER', true, true, 29, TIME '23:59:59'),
        (21, 'dashboard.day30@example.com', 'USER', true, true, 30, TIME '09:00:00'),
        (22, 'dashboard.day60@example.com', 'USER', true, true, 60, TIME '09:00:00'),
        (23, 'dashboard.day89.start@example.com', 'USER', true, true, 89, TIME '00:00:00'),
        (24, 'dashboard.day89.end@example.com', 'USER', true, true, 89, TIME '23:59:59'),
        (25, 'dashboard.day90@example.com', 'USER', true, true, 90, TIME '23:59:59'),
        (26, 'dashboard.unverified.today@example.com', 'USER', true, false, 0, TIME '00:00:00'),
        (27, 'dashboard.unverified.day6@example.com', 'USER', true, false, 6, TIME '09:00:00'),
        (28, 'dashboard.admin@example.com', 'ADMIN', false, true, 0, TIME '00:00:00'),
        (29, 'dashboard.locked@example.com', 'USER', false, true, 0, TIME '00:00:00')
), vietnam_today AS (
    SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS today
)
INSERT INTO accounts
    (id, email, password, role, active, email_verified, created_at)
SELECT fixture.id,
       fixture.email,
       '$2a$10$XbLZ1Ev3uhKxURIO9T3hX.dJ5F0ZxU/hB3pbMUHPkiiRVetnzK5nK',
       fixture.role,
       fixture.active,
       fixture.email_verified,
       ((vietnam_today.today - fixture.days_ago) + fixture.local_time)
           AT TIME ZONE 'Asia/Ho_Chi_Minh'
FROM registration_fixtures fixture
CROSS JOIN vietnam_today;

INSERT INTO users (id, full_name, account_id)
SELECT a.id, (ARRAY['Đỗ Minh Khang', 'Nguyễn Thu Hà', 'Trần Quang Vinh', 'Lê Bảo Ngọc', 'Phạm Đức Anh', 'Võ Khánh Vy', 'Hoàng Minh Tuấn', 'Đặng Thảo Nguyên', 'Bùi Gia Bảo', 'Dương Ngọc Anh', 'Ngô Tuấn Kiệt', 'Đinh Thanh Tâm', 'Huỳnh Như Ý', 'Mai Hoàng Long', 'Trương Hải Yến', 'Vũ Quốc Hưng', 'Cao Ngọc Hân', 'Lý Minh Châu', 'Hồ Trọng Nhân', 'Tạ Minh Thư'])[a.id::integer - 9], a.id
FROM accounts a
WHERE a.id BETWEEN 10 AND 29;


INSERT INTO categories (id, name)
VALUES
    (1, 'Cơm'),
    (2, 'Phở'),
    (3, 'Bún'),
    (4, 'Mì'),
    (5, 'Đồ ăn vặt'),
    (6, 'Lẩu'),
    (7, 'Đồ uống'),
    (8, 'Đồ ăn sáng'),
    (9, 'Khác'),
    (10, 'Bánh mì'),
    (11, 'Món chay'),
    (12, 'Hải sản');

INSERT INTO addresses (id, street, ward, province)
VALUES
    (1, '26-30-32 Lê Thị Riêng', 'Phường Bến Thành', 'Thành phố Hồ Chí Minh'),
    (2, '66 Trần Quốc Toản', 'Phường Xuân Hòa', 'Thành phố Hồ Chí Minh'),
    (3, '16 Trần Cao Vân', 'Phường Sài Gòn', 'Thành phố Hồ Chí Minh'),
    (4, '125 Hai Bà Trưng', 'Phường Sài Gòn', 'Thành phố Hồ Chí Minh'),
    (5, '158 Pasteur, tầng thượng', 'Phường Sài Gòn', 'Thành phố Hồ Chí Minh'),
    (6, '130 Nguyễn Trãi', 'Phường Bến Thành', 'Thành phố Hồ Chí Minh'),
    (7, '212B/D48 Nguyễn Trãi', 'Phường Cầu Ông Lãnh', 'Thành phố Hồ Chí Minh'),
    (8, '59 Hồ Xuân Hương', 'Phường Xuân Hòa', 'Thành phố Hồ Chí Minh');

-- 1. Bánh mì Huynh Hoa - Lê Thị Riêng: https://banhmihuynhhoa.vn/lien-he/ | https://banhmihuynhhoa.vn/banh-mi-huynh-hoa/
-- 2. Phở Việt Nam - Trần Quốc Toản: https://phovietnam.vn/lien-he.html | https://phovietnam.vn/ | https://mapstore.vn/doanh-nghiep/quan-pho-viet-nam-quan-3-66-tran-quoc-toan-xuan-hoa-ho-chi-minh
-- 3. Quán Bụi Heritage: https://quan-bui.com/quan-bui-heritage/
-- 4. Hum Central: https://hum-dining.vn/ | https://hum-dining.vn/dia-diem/
-- 5. Secret Garden - Pasteur: https://secretgardensaigon.com/ | https://plo.vn/canh-sat-dua-robot-taf35-den-dap-dam-chay-chung-cu-o-phuong-sai-gon-post870267.amp
-- 6. Đèn Lồng - Nguyễn Trãi: https://www.denlongrestaurant.com/
-- 7. Ốc Đào - Nguyễn Trãi: https://ocdaonguyentrai.com/ | https://guide.michelin.com/vn/en/ho-chi-minh/ho-chi-minh_2978179/restaurant/oc-%C4%91ao
-- 8. Cơm Niêu Sài Gòn - Hồ Xuân Hương: https://comnieusaigon.com/
INSERT INTO eateries (id, name, phone_contact, content, status, rejection_reason, created_at, updated_at, address_id, category_id, user_id, version)
VALUES
    (1, 'Bánh mì Huynh Hoa - Lê Thị Riêng', '0338044646', 'Bánh mì Huynh Hoa tại Lê Thị Riêng phục vụ bánh mì nhân thịt nguội, chả, pa-tê và rau ăn kèm. Đây là một trong các cửa hàng được thương hiệu công bố trên website chính thức.', 'APPROVED', NULL, (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 50) + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 50) + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 1, 10, 2, 0),
    (2, 'Phở Việt Nam - Trần Quốc Toản', '0943635050', 'Phở Việt Nam tại Trần Quốc Toản phục vụ phở bò và phở thố đá, với bánh phở tươi. Cửa hàng nằm tại số 66 Trần Quốc Toản, phường Xuân Hòa, TP. Hồ Chí Minh.', 'APPROVED', NULL, (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 29) + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 29) + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 2, 2, 3, 0),
    (3, 'Quán Bụi Heritage', '0941057203', 'Quán Bụi Heritage phục vụ các món Việt theo phong cách cơm nhà tại 16 Trần Cao Vân. Không gian mang phong cách Đông Dương, với bàn ghế gỗ và các chi tiết trang trí gợi ký ức Sài Gòn.', 'APPROVED', NULL, (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 21) + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 21) + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 3, 1, 4, 0),
    (4, 'Hum Central', '0899189229', 'Hum Central là nhà hàng ẩm thực thực vật tại 125 Hai Bà Trưng. Không gian trong tòa nhà cũ, những khung cửa vòm và mảng xanh tạo nên một điểm dùng bữa giữa trung tâm Sài Gòn.', 'APPROVED', NULL, (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 15) + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 15) + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 4, 11, 5, 0),
    (5, 'Secret Garden - Pasteur', '0909904621', 'Secret Garden tại Pasteur phục vụ món Việt trong không gian sân vườn trên tầng thượng. Quán ở số 158 Pasteur, có bàn ăn dưới đèn lồng và các góc xanh giữa khu trung tâm thành phố.', 'APPROVED', NULL, (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 8) + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 8) + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 5, 1, 6, 0),
    (6, 'Đèn Lồng - Nguyễn Trãi', '0909949183', 'Đèn Lồng tại 130 Nguyễn Trãi phục vụ các món ăn Việt theo phong cách cơm nhà. Không gian trang trí đèn lồng nhiều màu, với thực đơn có món cuốn, món kho và các món ăn truyền thống.', 'APPROVED', NULL, (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 5) + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 5) + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 6, 1, 7, 0),
    (7, 'Ốc Đào - Nguyễn Trãi', '0909437033', 'Ốc Đào tại 212B/D48 Nguyễn Trãi chuyên các món ốc và hải sản. Thực đơn có ốc hương sốt trứng muối, sò điệp nướng mỡ hành, nghêu và các món chế biến với bơ tỏi.', 'APPROVED', NULL, (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 2) + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 2) + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 7, 12, 8, 0),
    (8, 'Cơm Niêu Sài Gòn - Hồ Xuân Hương', '0901301728', 'Cơm Niêu Sài Gòn tại 59 Hồ Xuân Hương phục vụ cơm niêu và các món Việt. Thực đơn có cá bông lau kho tộ, canh chua cá, món rau và các món dùng chung cho bữa cơm gia đình.', 'APPROVED', NULL, (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 1) + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 1) + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh', 8, 1, 9, 0);

INSERT INTO images (id, public_id, url, type, eatery_id, review_id)
VALUES
    (1, 'quanngon/demo/hcmc-20261103-124504/huynh-hoa-thumbnail', 'https://res.cloudinary.com/vcprenig/image/upload/v1793684708/quanngon/demo/hcmc-20261103-124504/huynh-hoa-thumbnail.jpg', 'THUMBNAIL', 1, NULL),
    (2, 'quanngon/demo/hcmc-20261103-124504/huynh-hoa-gallery', 'https://res.cloudinary.com/vcprenig/image/upload/v1793684710/quanngon/demo/hcmc-20261103-124504/huynh-hoa-gallery.png', 'GALLERY', 1, NULL),
    (3, 'quanngon/demo/hcmc-20261103-124504/pho-viet-nam-thumbnail', 'https://res.cloudinary.com/vcprenig/image/upload/v1793684713/quanngon/demo/hcmc-20261103-124504/pho-viet-nam-thumbnail.png', 'THUMBNAIL', 2, NULL),
    (4, 'quanngon/demo/hcmc-20261103-124504/pho-viet-nam-gallery', 'https://res.cloudinary.com/vcprenig/image/upload/v1793684715/quanngon/demo/hcmc-20261103-124504/pho-viet-nam-gallery.jpg', 'GALLERY', 2, NULL),
    (5, 'quanngon/demo/hcmc-20261103-124504/quan-bui-thumbnail', 'https://res.cloudinary.com/vcprenig/image/upload/v1793684717/quanngon/demo/hcmc-20261103-124504/quan-bui-thumbnail.webp', 'THUMBNAIL', 3, NULL),
    (6, 'quanngon/demo/hcmc-20261103-124504/quan-bui-gallery', 'https://res.cloudinary.com/vcprenig/image/upload/v1793684718/quanngon/demo/hcmc-20261103-124504/quan-bui-gallery.webp', 'GALLERY', 3, NULL),
    (7, 'quanngon/demo/hcmc-20261103-124504/hum-thumbnail', 'https://res.cloudinary.com/vcprenig/image/upload/v1793684721/quanngon/demo/hcmc-20261103-124504/hum-thumbnail.png', 'THUMBNAIL', 4, NULL),
    (8, 'quanngon/demo/hcmc-20261103-124504/hum-gallery', 'https://res.cloudinary.com/vcprenig/image/upload/v1793684724/quanngon/demo/hcmc-20261103-124504/hum-gallery.png', 'GALLERY', 4, NULL),
    (9, 'quanngon/demo/hcmc-20261103-124504/secret-garden-thumbnail', 'https://res.cloudinary.com/vcprenig/image/upload/v1793684726/quanngon/demo/hcmc-20261103-124504/secret-garden-thumbnail.webp', 'THUMBNAIL', 5, NULL),
    (10, 'quanngon/demo/hcmc-20261103-124504/secret-garden-gallery', 'https://res.cloudinary.com/vcprenig/image/upload/v1793684728/quanngon/demo/hcmc-20261103-124504/secret-garden-gallery.webp', 'GALLERY', 5, NULL),
    (11, 'quanngon/demo/hcmc-20261103-124504/den-long-thumbnail', 'https://res.cloudinary.com/vcprenig/image/upload/v1793684730/quanngon/demo/hcmc-20261103-124504/den-long-thumbnail.webp', 'THUMBNAIL', 6, NULL),
    (12, 'quanngon/demo/hcmc-20261103-124504/den-long-gallery', 'https://res.cloudinary.com/vcprenig/image/upload/v1793684732/quanngon/demo/hcmc-20261103-124504/den-long-gallery.jpg', 'GALLERY', 6, NULL),
    (13, 'quanngon/demo/hcmc-20261103-124504/oc-dao-thumbnail', 'https://res.cloudinary.com/vcprenig/image/upload/v1793684735/quanngon/demo/hcmc-20261103-124504/oc-dao-thumbnail.webp', 'THUMBNAIL', 7, NULL),
    (14, 'quanngon/demo/hcmc-20261103-124504/oc-dao-gallery', 'https://res.cloudinary.com/vcprenig/image/upload/v1793684737/quanngon/demo/hcmc-20261103-124504/oc-dao-gallery.webp', 'GALLERY', 7, NULL),
    (15, 'quanngon/demo/hcmc-20261103-124504/com-nieu-thumbnail', 'https://res.cloudinary.com/vcprenig/image/upload/v1793684739/quanngon/demo/hcmc-20261103-124504/com-nieu-thumbnail.webp', 'THUMBNAIL', 8, NULL),
    (16, 'quanngon/demo/hcmc-20261103-124504/com-nieu-gallery', 'https://res.cloudinary.com/vcprenig/image/upload/v1793684742/quanngon/demo/hcmc-20261103-124504/com-nieu-gallery.jpg', 'GALLERY', 8, NULL);

-- Synthetic review scores exercise Home top 3 and review pagination, not real opinions.
INSERT INTO reviews (reviewid, food_quantity, service_quantity, space, cleanliness, content, created_at, eatery_id, user_id)
VALUES
    (1, 4, 4, 4, 4, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 1, 3),
    (2, 4, 4, 4, 4, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 1, 4),
    (3, 4, 4, 4, 4, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 1, 5),
    (4, 4, 4, 4, 4, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 1, 6),
    (5, 4, 4, 4, 4, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 1, 7),
    (6, 4, 4, 4, 4, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 1, 8),
    (7, 4, 4, 4, 4, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 1, 9),
    (8, 5, 5, 5, 5, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 2, 2),
    (9, 5, 5, 4, 5, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 2, 5),
    (10, 5, 5, 5, 5, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 3, 2),
    (11, 5, 5, 4, 5, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 3, 6),
    (12, 4, 4, 4, 4, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 4, 2),
    (13, 4, 4, 4, 4, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 4, 7),
    (14, 4, 4, 4, 4, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 5, 2),
    (15, 4, 4, 4, 4, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 5, 8),
    (16, 4, 4, 4, 4, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 6, 2),
    (17, 4, 4, 4, 4, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 6, 9),
    (18, 4, 4, 4, 4, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 8, 2),
    (19, 4, 4, 4, 4, 'Đánh giá demo để kiểm tra giao diện và điểm trung bình. Đây không phải nhận xét thực tế của khách hàng.', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + TIME '00:00:00', 8, 3);

INSERT INTO favorites (id, user_id, eatery_id)
VALUES
    (1, 2, 1),
    (2, 2, 2),
    (3, 2, 3),
    (4, 2, 4),
    (5, 2, 5),
    (6, 2, 6),
    (7, 2, 7),
    (8, 2, 8),
    (9, 1, 2),
    (10, 3, 1),
    (11, 3, 8),
    (12, 4, 4);

SELECT setval(pg_get_serial_sequence('accounts', 'id'),
    COALESCE((SELECT MAX(id) FROM accounts), 1),
    EXISTS (SELECT 1 FROM accounts));

SELECT setval(pg_get_serial_sequence('users', 'id'),
    COALESCE((SELECT MAX(id) FROM users), 1),
    EXISTS (SELECT 1 FROM users));

SELECT setval(pg_get_serial_sequence('categories', 'id'),
    COALESCE((SELECT MAX(id) FROM categories), 1),
    EXISTS (SELECT 1 FROM categories));

SELECT setval(pg_get_serial_sequence('addresses', 'id'),
    COALESCE((SELECT MAX(id) FROM addresses), 1),
    EXISTS (SELECT 1 FROM addresses));

SELECT setval(pg_get_serial_sequence('eateries', 'id'),
    COALESCE((SELECT MAX(id) FROM eateries), 1),
    EXISTS (SELECT 1 FROM eateries));

SELECT setval(pg_get_serial_sequence('images', 'id'),
    COALESCE((SELECT MAX(id) FROM images), 1),
    EXISTS (SELECT 1 FROM images));

SELECT setval(pg_get_serial_sequence('favorites', 'id'),
    COALESCE((SELECT MAX(id) FROM favorites), 1),
    EXISTS (SELECT 1 FROM favorites));

SELECT setval(pg_get_serial_sequence('reviews', 'reviewid'),
    COALESCE((SELECT MAX(reviewid) FROM reviews), 1),
    EXISTS (SELECT 1 FROM reviews));

SELECT setval(pg_get_serial_sequence('refresh_tokens', 'id'),
    COALESCE((SELECT MAX(id) FROM refresh_tokens), 1),
    EXISTS (SELECT 1 FROM refresh_tokens));

COMMIT;

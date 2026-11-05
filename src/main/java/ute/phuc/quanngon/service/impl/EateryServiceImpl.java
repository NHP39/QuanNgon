package ute.phuc.quanngon.service.impl;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import ute.phuc.quanngon.dto.CloudinaryUploadResult;
import ute.phuc.quanngon.dto.Request.UpdateEateryStatusRequest;
import ute.phuc.quanngon.dto.Request.UpdateMyEateryRequest;
import ute.phuc.quanngon.dto.Request.UpdateEateryVisibilityRequest;
import ute.phuc.quanngon.exception.EateryConflictException;
import ute.phuc.quanngon.exception.EateryVersionConflictException;
import ute.phuc.quanngon.exception.InvalidEateryStatusTransitionException;
import ute.phuc.quanngon.exception.InvalidRejectionReasonException;
import ute.phuc.quanngon.exception.InvalidImageException;
import ute.phuc.quanngon.repository.EateryStatusCount;
import ute.phuc.quanngon.dto.Request.CreateEateryRequest;
import ute.phuc.quanngon.dto.Response.*;
import ute.phuc.quanngon.entity.*;
import ute.phuc.quanngon.enums.EateryStatus;
import ute.phuc.quanngon.enums.ImageType;
import ute.phuc.quanngon.event.CacheInvalidationEvent;
import ute.phuc.quanngon.exception.ResourceNotFoundException;
import ute.phuc.quanngon.repository.CategoryRepository;
import ute.phuc.quanngon.repository.EateryCardProjection;
import ute.phuc.quanngon.repository.EateryImageProjection;
import ute.phuc.quanngon.repository.EateryRepository;
import ute.phuc.quanngon.repository.EateryReviewSummary;
import ute.phuc.quanngon.repository.ImageRepository;
import ute.phuc.quanngon.repository.FavoriteRepository;
import ute.phuc.quanngon.repository.ReviewRepository;
import ute.phuc.quanngon.repository.UserRepository;
import ute.phuc.quanngon.service.CloudinaryService;
import ute.phuc.quanngon.service.EateryService;
import ute.phuc.quanngon.service.FeaturedEateryService;
import ute.phuc.quanngon.validator.ImageValidator;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static ute.phuc.quanngon.config.RedisCacheConfig.DASHBOARD_EATERY_STATUSES;
import static ute.phuc.quanngon.config.RedisCacheConfig.DASHBOARD_POSTS;
import static ute.phuc.quanngon.config.RedisCacheConfig.FEATURED_EATERIES;

@Service
@RequiredArgsConstructor
public class EateryServiceImpl implements EateryService {

    private final EateryRepository eateryRepository;
    private final ImageRepository imageRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository  userRepository;
    private final CategoryRepository categoryRepository;
    private final ImageValidator imageValidator;
    private final CloudinaryService cloudinaryService;
    private final FavoriteRepository favoriteRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final FeaturedEateryService featuredEateryService;

    @Override
    @Transactional
    public EateryDetailResponse getPublicEateryDetail(Long eateryId) {
        // Tìm quán đã được duyệt cùng thông tin liên quan.
        Eatery eatery = eateryRepository.findPublicEateryDetail(eateryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy quán ăn"));

        // Lấy số đánh giá và điểm trung bình từng tiêu chí.
        EateryReviewSummary summary = reviewRepository.summarizeByEateryId(eateryId);
        double averageRating = (
                summary.getFoodQuantity()
                        + summary.getServiceQuantity()
                        + summary.getSpace()
                        + summary.getCleanliness()
        ) / 4.0;

        // Sắp xếp thumbnail trước, các ảnh cùng loại theo ID.
        List<ImageResponse> images = eatery.getImages().stream()
                .sorted(Comparator.comparingInt((Image image) ->
                        image.getType() == ImageType.THUMBNAIL ? 0 : 1)
                        .thenComparing(Image::getId))
                .map(image -> new ImageResponse(
                        image.getId(),
                        image.getUrl(),
                        image.getType()))
                .toList();

        // Chuyển dữ liệu sang response công khai.
        Category category = eatery.getCategory();
        Address address = eatery.getAddress();
        return new EateryDetailResponse(
                eatery.getId(),
                eatery.getName(),
                eatery.getPhoneContact(),
                eatery.getContent(),
                new CategoryResponse(category.getId(), category.getName()),
                new AddressResponse(
                        address.getStreet(),
                        address.getWard(),
                        address.getProvince()),
                images,
                averageRating,
                summary.getReviewCount(),
                new CriteriaAveragesResponse(
                        summary.getFoodQuantity(),
                        summary.getServiceQuantity(),
                        summary.getSpace(),
                        summary.getCleanliness()));
    }

    @Override
    public List<String> getPublicEateryProvinces() {
        return eateryRepository.findDistinctApprovedEateryProvinces();
    }

    @Override
    public PageResponse<EateryCardResponse> getPublicEateries(
            String q,
            Long categoryId,
            String province,
            String sort,
            int page,
            int size,
            String viewerEmail) {

        // Chuẩn hóa điều kiện tìm kiếm và lọc.
        String keyword = q == null ? "" : q.strip();
        String provinceFilter = province == null ? "" : province.strip();

        // Dùng cache cho đúng truy vấn top 3 không có bộ lọc.
        boolean featuredRequest = "highestRated".equals(sort)
                && keyword.isEmpty()
                && categoryId == null
                && provinceFilter.isEmpty()
                && page == 0
                && size == 3;
        if (featuredRequest) {
            return withFavoriteStatus(featuredEateryService.getFeaturedEateries(), viewerEmail);
        }

        // Chọn cách sắp xếp.
        boolean onlyWithReviews = "highestRated".equals(sort);
        Sort ordering = onlyWithReviews
                ? Sort.by(Sort.Order.desc("averageRating"), Sort.Order.desc("reviewCount"), Sort.Order.desc("id"))
                : Sort.by(Sort.Direction.DESC, "createdAt", "id");

        // Lấy dữ liệu card và điểm trung bình từ DB.
        Page<EateryCardProjection> cardPage = eateryRepository.searchPublicEateryCards(
                EateryStatus.APPROVED, keyword, categoryId, provinceFilter, onlyWithReviews,
                PageRequest.of(page, size, ordering));

        // Lấy trạng thái yêu thích của các quán trong trang bằng một truy vấn.
        List<Long> eateryIds = cardPage.getContent().stream()
                .map(EateryCardProjection::getId).toList();
        Set<Long> favoriteEateryIds = findFavoriteEateryIds(eateryIds, viewerEmail);

        // Chuyển projection thành response phân trang.
        Page<EateryCardResponse> responsePage = cardPage.map(row -> new EateryCardResponse(
                row.getId(),
                row.getName(),
                row.getCategoryName(),
                new AddressResponse(row.getStreet(), row.getWard(), row.getProvince()),
                row.getThumbnailUrl(),
                row.getAverageRating(),
                row.getReviewCount(),
                favoriteEateryIds.contains(row.getId())));

        return new PageResponse<>(
                responsePage.getContent(),
                responsePage.getNumber(),
                responsePage.getSize(),
                responsePage.getTotalElements(),
                responsePage.getTotalPages()
        );
    }

    @Override
    @Transactional
    public PageResponse<MyEateryResponse> getMyEateries(
            String ownerEmail, EateryStatus status, int page, int size) {
        // Lấy trang quán của tài khoản hiện tại
        Pageable pageable = PageRequest.of(page, size, Sort.Direction.DESC, "updatedAt", "id");
        Page<Eatery> eateryPage = eateryRepository.findMyEateries(ownerEmail, status, pageable);

        // Lấy ảnh của toàn bộ quán trong trang.
        Map<Long, List<ImageResponse>> imagesByEateryId = loadImagesByEateryId(eateryPage.getContent());

        // Ghép ảnh vào từng quán và giữ thông tin phân trang.
        Page<MyEateryResponse> responsePage = eateryPage.map(eatery -> toMyEateryResponse(
                eatery, imagesByEateryId.getOrDefault(eatery.getId(), List.of())));
        return new PageResponse<>(
                responsePage.getContent(),
                responsePage.getNumber(),
                responsePage.getSize(),
                responsePage.getTotalElements(),
                responsePage.getTotalPages());
    }

    @Override
    @Transactional
    public MyEateryResponse getMyEateryDetail(Long eateryId, String ownerEmail) {
        // Tìm quán thuộc tài khoản hiện tại.
        Eatery eatery = eateryRepository.findMyEateryDetail(eateryId, ownerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy quán ăn"));

        // Lấy ảnh.
        Map<Long, List<ImageResponse>> imagesByEateryId = loadImagesByEateryId(List.of(eatery));

        // Chuyển dữ liệu sang response.
        return toMyEateryResponse(
                eatery,
                imagesByEateryId.getOrDefault(eatery.getId(), List.of()));
    }

    @Override
    @Transactional
    public MyEateryResponse updateMyEatery(
            Long eateryId,
            String ownerEmail,
            UpdateMyEateryRequest request,
            MultipartFile thumbnail,
            List<MultipartFile> gallery
    ) {
        // Tìm quán thuộc tài khoản hiện tại.
        Eatery eatery = eateryRepository.findMyEateryDetail(eateryId, ownerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy quán ăn"));

        // Kiểm tra version và trạng thái .
        if (!eatery.getVersion().equals(request.version())) {
            throw new EateryVersionConflictException(
                    "Thông tin quán đã thay đổi. Vui lòng kiểm tra lại trước khi thao tác.");
        }

        if (eatery.getStatus() != EateryStatus.PENDING) {
            throw new EateryConflictException("Chỉ được chỉnh sửa quán đang Chờ duyệt.");
        }

        // Kiểm tra danh mục.
        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));

        // Kiểm tra các ảnh cần xóa thuộc quán.
        List<Image> currentImages = eatery.getImages();
        Set<Long> imageIdsToRemove = new HashSet<>(request.removeImageIds());
        long matchedImageCount = currentImages.stream()
                .filter(image -> imageIdsToRemove.contains(image.getId()))
                .count();

        if (matchedImageCount != imageIdsToRemove.size()) {
            throw new InvalidImageException("Ảnh cần xóa không tồn tại hoặc không thuộc quán của bạn.");
        }

        // Kiểm tra ảnh mới và số lượng ảnh sau chỉnh sửa.
        if (thumbnail != null) {
            imageValidator.validateThumbnail(thumbnail);
        }

        List<MultipartFile> newGallery = gallery == null ? List.of() : gallery;
        imageValidator.validateGallery(newGallery);

        long remainingThumbnailCount = currentImages.stream()
                .filter(image -> image.getType() == ImageType.THUMBNAIL)
                .filter(image -> !imageIdsToRemove.contains(image.getId()))
                .count();

        if (thumbnail == null && remainingThumbnailCount != 1) {
            throw new InvalidImageException(
                    "Quán phải có một ảnh đại diện. Vui lòng tải lên ảnh đại diện mới.");
        }

        long remainingGalleryCount = currentImages.stream()
                .filter(image -> image.getType() == ImageType.GALLERY)
                .filter(image -> !imageIdsToRemove.contains(image.getId()))
                .count();

        if (remainingGalleryCount + newGallery.size() > 6) {
            throw new InvalidImageException("Gallery chỉ được tối đa 6 ảnh.");
        }

        // Xác định ảnh cũ cần xóa hoặc thay thế.
        List<Image> imagesToRemove = currentImages.stream()
                .filter(image -> imageIdsToRemove.contains(image.getId())
                        || (thumbnail != null && image.getType() == ImageType.THUMBNAIL))
                .toList();

        // Đăng ký dọn ảnh mới khi rollback và ảnh cũ sau commit.
        List<String> uploadedPublicIds = new ArrayList<>();
        cloudinaryService.registerRollbackCleanup(uploadedPublicIds);
        List<String> removedPublicIds = imagesToRemove.stream()
                .map(Image::getPublicId)
                .toList();
        cloudinaryService.registerCommitCleanup(removedPublicIds);

        // Gỡ ảnh cũ khỏi quán.
        for (Image image : imagesToRemove) {
            currentImages.remove(image);
            image.setEatery(null);
        }

        // Upload ảnh đại diện mới nếu có.
        if (thumbnail != null) {
            CloudinaryUploadResult result = cloudinaryService.upload(thumbnail);
            uploadedPublicIds.add(result.publicId());
            currentImages.add(createImage(result, ImageType.THUMBNAIL, eatery));
        }

        // Upload các ảnh gallery mới.
        for (MultipartFile file : newGallery) {
            CloudinaryUploadResult result = cloudinaryService.upload(file);
            uploadedPublicIds.add(result.publicId());
            currentImages.add(createImage(result, ImageType.GALLERY, eatery));
        }

        // Cập nhật thông tin quán và địa chỉ.
        eatery.setName(request.name());
        eatery.setPhoneContact(request.phoneContact());
        eatery.setContent(request.content());
        eatery.setCategory(category);

        Address address = eatery.getAddress();
        address.setStreet(request.address().street().strip());
        address.setWard(request.address().ward().strip());
        address.setProvince(request.address().province().strip());

        // Đánh dấu quán thay đổi.
        eatery.setUpdatedAt(Instant.now());

        Eatery savedEatery = eateryRepository.saveAndFlush(eatery);

        // Trả thông tin quán cùng ảnh sau cập nhật.
        Map<Long, List<ImageResponse>> imagesByEateryId = loadImagesByEateryId(List.of(savedEatery));
        return toMyEateryResponse(
                savedEatery,
                imagesByEateryId.getOrDefault(savedEatery.getId(), List.of()));
    }

    @Override
    @Transactional
    public MyEateryResponse updateMyEateryVisibility(
            Long eateryId,
            String ownerEmail,
            UpdateEateryVisibilityRequest request
    ) {
        // Tìm quán thuộc tài khoản hiện tại.
        Eatery eatery = eateryRepository.findMyEateryDetail(eateryId, ownerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy quán ăn"));

        // Kiểm tra version người dùng đang thao tác.
        Long expectedVersion = request.version();
        if (!eatery.getVersion().equals(expectedVersion)) {
            throw new EateryVersionConflictException(
                    "Thông tin quán đã thay đổi. Vui lòng kiểm tra lại trước khi thao tác.");
        }

        // Chỉ cho phép ẩn quán đã duyệt hoặc bỏ ẩn quán đang ẩn.
        EateryStatus currentStatus = eatery.getStatus();
        EateryStatus targetStatus = request.hidden() ? EateryStatus.HIDDEN : EateryStatus.APPROVED;
        boolean canChangeVisibility =
                (currentStatus == EateryStatus.APPROVED && targetStatus == EateryStatus.HIDDEN)
                        || (currentStatus == EateryStatus.HIDDEN && targetStatus == EateryStatus.APPROVED);

        if (!canChangeVisibility) {
            throw new EateryConflictException("Chỉ được ẩn quán đã duyệt hoặc bỏ ẩn quán đang ẩn.");
        }

        // Cập nhật trạng thái và flush để lấy version mới.
        eatery.setStatus(targetStatus);
        Eatery savedEatery = eateryRepository.saveAndFlush(eatery);

        // Xóa thống kê trạng thái và top 3 sau khi cập nhật thành công.
        eventPublisher.publishEvent(new CacheInvalidationEvent(
                Set.of(DASHBOARD_EATERY_STATUSES, FEATURED_EATERIES)));

        // Trả thông tin quán cùng ảnh.
        Map<Long, List<ImageResponse>> imagesByEateryId = loadImagesByEateryId(List.of(savedEatery));
        return toMyEateryResponse(
                savedEatery,
                imagesByEateryId.getOrDefault(savedEatery.getId(), List.of()));
    }

    @Override
    @Transactional
    public void deleteMyEatery(Long eateryId, String ownerEmail) {
        // Tìm quán thuộc tài khoản hiện tại.
        Eatery eatery = eateryRepository.findMyEateryDetail(eateryId, ownerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy quán ăn"));

        // Thu thập ảnh của quán và các đánh giá.
        List<String> publicIds = new ArrayList<>();
        for (Image image : eatery.getImages()) {
            publicIds.add(image.getPublicId());
        }
        for (Review review : eatery.getReviews()) {
            for (Image image : review.getImages()) {
                publicIds.add(image.getPublicId());
            }
        }

        // Chỉ dọn ảnh Cloudinary sau khi transaction commit thành công.
        cloudinaryService.registerCommitCleanup(publicIds);

        // Xóa quán và dữ liệu liên quan bằng cascade hiện có.
        eateryRepository.delete(eatery);
        eateryRepository.flush();

        // Xóa thống kê và top 3 sau khi xóa quán thành công.
        eventPublisher.publishEvent(new CacheInvalidationEvent(
                Set.of(DASHBOARD_EATERY_STATUSES, DASHBOARD_POSTS, FEATURED_EATERIES)));
    }

    @Override
    @Transactional
    public AdminEateryPageResponse<AdminEateryResponse> getEateryByStatus(EateryStatus status, String q, int page, int size) {

        Pageable  pageable = PageRequest.of(page, size, Sort.Direction.DESC, "createdAt", "id");

        String keyword =  ((q == null) || q.isBlank()) ? "" : q.strip();

        Page<Eatery> pageEateries = eateryRepository.searchEateries(status, keyword, null, pageable);

        // Lấy ảnh cho cả trang và ghép vào từng card Admin.
        Map<Long, List<ImageResponse>> imagesByEateryId = loadImagesByEateryId(pageEateries.getContent());
        Page<AdminEateryResponse> pageAdminCardResponse = pageEateries.map(eatery -> toAdminEateryCard(
                eatery, imagesByEateryId.getOrDefault(eatery.getId(), List.of())));

        return new AdminEateryPageResponse<>(
                pageAdminCardResponse.getContent(),
                pageAdminCardResponse.getNumber(),
                pageAdminCardResponse.getSize(),
                pageAdminCardResponse.getTotalElements(),
                pageAdminCardResponse.getTotalPages(),
                getEateryCountsByStatus()
        );
    }

    @Override
    @Transactional
    public EateryResponse createEatery(
            CreateEateryRequest request,
            MultipartFile thumbnail,
            List<MultipartFile> gallery,
            String email
    ) {

        // Kiểm tra ảnh trước khi upload.
        imageValidator.validateThumbnail(thumbnail);
        imageValidator.validateGallery(gallery);

        // Lấy người đăng và danh mục.
        User owner = userRepository.findByAccountEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException(email));

        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));

        // Đăng ký dọn ảnh nếu transaction rollback.
        List<String> uploadedPublicIds = new ArrayList<>();
        cloudinaryService.registerRollbackCleanup(uploadedPublicIds);

        // Tạo địa chỉ và quán ở trạng thái chờ duyệt.
        Address address = Address.builder()
                .street(request.address().street())
                .ward(request.address().ward())
                .province(request.address().province())
                .build();

        Eatery eatery = Eatery.builder()
                .name(request.name())
                .phoneContact(request.phoneContact())
                .content(request.content())
                .category(category)
                .owner(owner)
                .address(address)
                .status(EateryStatus.PENDING)
                .build();

        // Upload ảnh đại diện và liên kết với quán.
        CloudinaryUploadResult thumbnailResult = cloudinaryService.upload(thumbnail);
        uploadedPublicIds.add(thumbnailResult.publicId());
        Image thumbnailImage = createImage(thumbnailResult, ImageType.THUMBNAIL, eatery);
        eatery.getImages().add(thumbnailImage);

        // Upload các ảnh bổ sung và liên kết với quán.
        if (gallery != null) {
            for (MultipartFile file : gallery) {
                CloudinaryUploadResult galleryResult = cloudinaryService.upload(file);
                uploadedPublicIds.add(galleryResult.publicId());
                Image galleryImage = createImage(galleryResult, ImageType.GALLERY, eatery);
                eatery.getImages().add(galleryImage);
            }
        }

        // Lưu quán và trả response.
        Eatery savedEatery = eateryRepository.save(eatery);

        // Xóa thống kê bị ảnh hưởng sau khi tạo quán thành công.
        eventPublisher.publishEvent(new CacheInvalidationEvent(Set.of(DASHBOARD_EATERY_STATUSES, DASHBOARD_POSTS)));
        return toResponse(savedEatery);
    }

    @Override
    @Transactional
    public AdminEateryResponse updateEateryStatus(Long eateryId, UpdateEateryStatusRequest request) {
        // Tìm quán
        Eatery eatery = eateryRepository.findById(eateryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài đăng"));

        // Kiểm tra version
        Long expectedVersion = request.version();
        Long currentVersion = eatery.getVersion();

        if (!currentVersion.equals(expectedVersion)) {
            throw new EateryVersionConflictException("Thông tin quán đã thay đổi. Vui lòng kiểm tra lại trước khi thao tác!");
        }

        // Kiểm tra chuyển trạng thái
        EateryStatus currentStatus = eatery.getStatus();
        EateryStatus targetStatus = request.status();
        if (!isAdminStatusTransitionAllowed(currentStatus, targetStatus)) {
            throw new InvalidEateryStatusTransitionException(
                    "Không thể chuyển trạng thái từ " + currentStatus + " sang " + targetStatus
            );
        }

        // Kiểm tra lý do nếu REJECT
        String rejectionReason = null;
        if (targetStatus == EateryStatus.REJECTED ) {
            if (request.reason() == null) {
                throw new InvalidRejectionReasonException("Lý do từ chối không được để trống!");
            }
            rejectionReason = request.reason().strip();
            if (rejectionReason.length() < 10 || rejectionReason.length() > 500){
                throw new InvalidRejectionReasonException("Lý do phải có từ 10 đến 500 ký tự!");
            }
        }

        // Cập nhật
        eatery.setStatus(targetStatus);
        eatery.setRejectionReason(rejectionReason);
        Eatery savedEatery =  eateryRepository.saveAndFlush(eatery);

        // Xóa thống kê trạng thái và top 3 sau khi cập nhật thành công.
        eventPublisher.publishEvent(new CacheInvalidationEvent(
                Set.of(DASHBOARD_EATERY_STATUSES, FEATURED_EATERIES)));

        // Trả response
        return toAdminEateryCard(savedEatery);

    }

    // Kiểm tra chuyển trạng thái hợp lệ
    private boolean isAdminStatusTransitionAllowed(EateryStatus currentStatus, EateryStatus targetStatus) {
        if (currentStatus == EateryStatus.PENDING) {
            return targetStatus == EateryStatus.APPROVED || targetStatus == EateryStatus.REJECTED;
        }
        return currentStatus == EateryStatus.REJECTED && targetStatus == EateryStatus.APPROVED;
    }

    @Override
    public Map<EateryStatus, Long> getEateryCountsByStatus() {
        // Khởi tạo đủ trạng thái với số lượng bằng 0.
        Map<EateryStatus, Long> countsByStatus = new EnumMap<>(EateryStatus.class);
        for (EateryStatus status : EateryStatus.values()) {
            countsByStatus.put(status, 0L);
        }

        // Cập nhật số lượng từ kết quả gom nhóm của DB.
        List<EateryStatusCount> groupedCounts =
                eateryRepository.countEateriesByStatus();
        for (EateryStatusCount groupedCount : groupedCounts) {
            countsByStatus.put(groupedCount.getStatus(), groupedCount.getCounts());
        }

        return countsByStatus;
    }

    private Set<Long> findFavoriteEateryIds(List<Long> eateryIds, String viewerEmail) {
        if (viewerEmail == null || eateryIds.isEmpty()) {
            return Set.of();
        }
        return new HashSet<>(favoriteRepository.findFavoriteEateryIds(viewerEmail, eateryIds));
    }

    private PageResponse<EateryCardResponse> withFavoriteStatus(
            PageResponse<EateryCardResponse> commonPage, String viewerEmail) {
        // Khách dùng bản chung; không thay đổi đối tượng đã cache.
        if (viewerEmail == null || commonPage.content().isEmpty()) {
            return commonPage;
        }

        // Lấy trạng thái tim mới nhất của người gọi.
        List<Long> eateryIds = commonPage.content().stream()
                .map(EateryCardResponse::id).toList();
        Set<Long> favoriteEateryIds = findFavoriteEateryIds(eateryIds, viewerEmail);

        // Tạo response riêng và giữ nguyên metadata phân trang.
        List<EateryCardResponse> content = commonPage.content().stream()
                .map(card -> new EateryCardResponse(
                        card.id(), card.name(), card.categoryName(), card.address(),
                        card.thumbnailUrl(), card.averageRating(), card.reviewCount(),
                        favoriteEateryIds.contains(card.id())))
                .toList();

        return new PageResponse<>(content, commonPage.page(), commonPage.size(),
                commonPage.totalElements(), commonPage.totalPages());
    }

    private Map<Long, List<ImageResponse>> loadImagesByEateryId(List<Eatery> eateries) {
        if (eateries.isEmpty()) {
            return Map.of();
        }

        List<Long> eateryIds = eateries.stream().map(Eatery::getId).toList();
        Map<Long, List<ImageResponse>> imagesByEateryId = new HashMap<>();
        for (EateryImageProjection image : imageRepository.findEateryImages(eateryIds)) {
            imagesByEateryId.computeIfAbsent(image.getEateryId(), id -> new ArrayList<>())
                    .add(new ImageResponse(image.getId(), image.getImageUrl(), image.getType()));
        }
        return imagesByEateryId;
    }

    private MyEateryResponse toMyEateryResponse(Eatery eatery, List<ImageResponse> images) {
        Category category = eatery.getCategory();
        Address address = eatery.getAddress();
        return new MyEateryResponse(
                eatery.getId(),
                eatery.getName(),
                eatery.getPhoneContact(),
                eatery.getContent(),
                eatery.getStatus(),
                eatery.getRejectionReason(),
                new CategoryResponse(category.getId(), category.getName()),
                new AddressResponse(address.getStreet(), address.getWard(), address.getProvince()),
                images,
                eatery.getVersion(),
                eatery.getCreatedAt(),
                eatery.getUpdatedAt());
    }

    private AdminEateryResponse toAdminEateryCard(Eatery eatery) {
        List<ImageResponse> images = eatery.getImages().stream()
                .sorted(Comparator.comparingInt((Image image) ->
                        image.getType() == ImageType.THUMBNAIL ? 0 : 1)
                        .thenComparing(Image::getId))
                .map(image -> new ImageResponse(image.getId(), image.getUrl(), image.getType()))
                .toList();
        return toAdminEateryCard(eatery, images);
    }

    private AdminEateryResponse toAdminEateryCard(Eatery eatery, List<ImageResponse> images) {
        Category category = eatery.getCategory();
        Address address = eatery.getAddress();
        User owner = eatery.getOwner();

        CategoryResponse categoryResponse = new CategoryResponse(
                        category.getId(), category.getName());

        AddressResponse addressResponse = new AddressResponse(
                        address.getStreet(),
                        address.getWard(),
                        address.getProvince());

        OwnerResponse ownerResponse = new OwnerResponse(
                        owner.getId(),
                        owner.getFullName(),
                        owner.getAccount().getEmail());

        return new AdminEateryResponse(
                eatery.getId(),
                eatery.getName(),
                eatery.getPhoneContact(),
                eatery.getContent(),
                eatery.getStatus(),
                eatery.getRejectionReason(),
                categoryResponse,
                addressResponse,
                images,
                ownerResponse,
                eatery.getVersion(),
                eatery.getCreatedAt()
        );
    }

    private EateryResponse toResponse(Eatery eatery) {
        List<ImageResponse> imageResponses = eatery.getImages()
                .stream()
                .map(image -> new ImageResponse(
                        image.getId(),
                        image.getUrl(),
                        image.getType()
                ))
                .toList();

        return new EateryResponse(
                eatery.getId(),
                eatery.getName(),
                eatery.getPhoneContact(),
                eatery.getContent(),
                eatery.getStatus(),
                new CategoryResponse(
                        eatery.getCategory().getId(),
                        eatery.getCategory().getName()
                ),
                new AddressResponse(
                        eatery.getAddress().getStreet(),
                        eatery.getAddress().getWard(),
                        eatery.getAddress().getProvince()
                ),
                imageResponses
        );
    }

    private Image createImage(
            CloudinaryUploadResult result,
            ImageType type,
            Eatery eatery) {
        return Image.builder()
                .url(result.imageUrl())
                .publicId(result.publicId())
                .type(type)
                .eatery(eatery)
                .build();
    }

}

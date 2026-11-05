package ute.phuc.quanngon.service.impl;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import ute.phuc.quanngon.dto.CloudinaryUploadResult;
import ute.phuc.quanngon.dto.Request.CreateReviewRequest;
import ute.phuc.quanngon.dto.Request.UpdateReviewRequest;
import ute.phuc.quanngon.dto.Response.PageResponse;
import ute.phuc.quanngon.dto.Response.ReviewAuthorResponse;
import ute.phuc.quanngon.dto.Response.ReviewImageResponse;
import ute.phuc.quanngon.dto.Response.ReviewResponse;
import ute.phuc.quanngon.entity.Image;
import ute.phuc.quanngon.entity.Review;
import ute.phuc.quanngon.entity.User;
import ute.phuc.quanngon.enums.EateryStatus;
import ute.phuc.quanngon.enums.ImageType;
import ute.phuc.quanngon.event.CacheInvalidationEvent;
import ute.phuc.quanngon.exception.InvalidImageException;
import ute.phuc.quanngon.exception.ResourceNotFoundException;
import ute.phuc.quanngon.exception.ReviewConflictException;
import ute.phuc.quanngon.repository.EateryRepository;
import ute.phuc.quanngon.repository.ImageRepository;
import ute.phuc.quanngon.repository.ReviewImageProjection;
import ute.phuc.quanngon.repository.ReviewRepository;
import ute.phuc.quanngon.repository.UserRepository;
import ute.phuc.quanngon.service.CloudinaryService;
import ute.phuc.quanngon.service.ReviewService;
import ute.phuc.quanngon.validator.ImageValidator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static ute.phuc.quanngon.config.RedisCacheConfig.FEATURED_EATERIES;

@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {
    private final EateryRepository eateryRepository;
    private final ReviewRepository reviewRepository;
    private final ImageRepository imageRepository;
    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;
    private final ImageValidator imageValidator;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public ReviewResponse createReview(
            Long eateryId,
            String email,
            CreateReviewRequest request,
            List<MultipartFile> images
    ) {
        // Kiểm tra quán đang công khai và lấy người đánh giá.
        ensurePublicEateryExists(eateryId);

        User reviewer = userRepository.findByAccountEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Không tìm thấy người dùng"));

        // Kiểm tra người dùng đã đánh giá quán chưa.
        if (reviewRepository.findCurrentUserReview(eateryId, email).isPresent()) {
            throw new ReviewConflictException("Bạn đã đánh giá quán ăn này");
        }

        // Kiểm tra ảnh trước khi upload.
        imageValidator.validateReviewImages(images);

        List<MultipartFile> reviewImages = images == null ? List.of() : images;

        // Đăng ký dọn ảnh nếu transaction rollback.
        List<String> uploadedPublicIds = new ArrayList<>();
        cloudinaryService.registerRollbackCleanup(uploadedPublicIds);

        // Tạo đánh giá và liên kết người gửi, quán ăn.
        Review review = Review.builder()
                .sender(reviewer)
                .eatery(eateryRepository.getReferenceById(eateryId))
                .foodQuantity(request.foodQuantity())
                .serviceQuantity(request.serviceQuantity())
                .space(request.space())
                .cleanliness(request.cleanliness())
                .content(request.content())
                .build();

        // Upload ảnh và liên kết ảnh với đánh giá.
        for (MultipartFile file : reviewImages) {
            CloudinaryUploadResult uploadResult = cloudinaryService.upload(file);
            uploadedPublicIds.add(uploadResult.publicId());

            Image image = Image.builder()
                    .publicId(uploadResult.publicId())
                    .url(uploadResult.imageUrl())
                    .type(ImageType.GALLERY)
                    .review(review)
                    .build();

            review.getImages().add(image);
        }

        // Gán thời gian, lưu đánh giá và xử lý hai request tạo trùng.
        review.setCreatedAt(LocalDateTime.now());
        Review savedReview;
        try {
            savedReview = reviewRepository.saveAndFlush(review);
        } catch (DataIntegrityViolationException ex) {
            if (ex.getCause() instanceof ConstraintViolationException violation
                    && "uk_reviews_user_eatery".equals(violation.getConstraintName())) {
                throw new ReviewConflictException("Bạn đã đánh giá quán ăn này");
            }
            throw ex;
        }

        // Xóa top 3 sau khi đánh giá được lưu thành công.
        eventPublisher.publishEvent(new CacheInvalidationEvent(Set.of(FEATURED_EATERIES)));

        // Map ảnh và trả đánh giá vừa tạo.
        List<ReviewImageResponse> imageResponses = savedReview.getImages().stream()
                .map(image -> new ReviewImageResponse(image.getId(), image.getUrl()))
                .toList();

        return toReviewResponse(savedReview, imageResponses);
    }

    @Override
    @Transactional
    public ReviewResponse updateCurrentUserReview(
            Long eateryId,
            String email,
            UpdateReviewRequest request,
            List<MultipartFile> images
    ) {
        // Kiểm tra quán và tìm đánh giá của người đăng nhập.
        ensurePublicEateryExists(eateryId);
        Review review = reviewRepository.findCurrentUserReview(eateryId, email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Không tìm thấy đánh giá của bạn"));

        // Kiểm tra các ảnh cần xóa có thuộc đánh giá này không.
        Set<Long> imageIdsToRemove = new HashSet<>(request.removeImageIds());
        List<Image> imagesToRemove = review.getImages().stream()
                .filter(image -> imageIdsToRemove.contains(image.getId()))
                .toList();

        if (imagesToRemove.size() != imageIdsToRemove.size()) {
            throw new InvalidImageException(
                    "Ảnh cần xóa không tồn tại hoặc không thuộc đánh giá của bạn");
        }

        // Kiểm tra ảnh mới và tổng số ảnh sau cập nhật.
        imageValidator.validateReviewImages(images);
        List<MultipartFile> newImages = images == null ? List.of() : images;
        int remainingImageCount = review.getImages().size() - imagesToRemove.size();
        if (remainingImageCount + newImages.size() > 4) {
            throw new InvalidImageException("Đánh giá chỉ được tối đa 4 ảnh");
        }

        // Đăng ký dọn ảnh mới khi rollback và ảnh cũ sau commit.
        List<String> uploadedPublicIds = new ArrayList<>();
        cloudinaryService.registerRollbackCleanup(uploadedPublicIds);
        List<String> removedPublicIds = imagesToRemove.stream()
                .map(Image::getPublicId)
                .toList();
        cloudinaryService.registerCommitCleanup(removedPublicIds);

        // Gỡ ảnh cũ khỏi đánh giá, orphanRemoval xóa bản ghi ảnh.
        for (Image image : imagesToRemove) {
            review.getImages().remove(image);
            image.setReview(null);
        }

        // Upload ảnh mới và liên kết với đánh giá.
        for (MultipartFile file : newImages) {
            CloudinaryUploadResult uploadResult = cloudinaryService.upload(file);
            uploadedPublicIds.add(uploadResult.publicId());
            Image image = Image.builder()
                    .publicId(uploadResult.publicId())
                    .url(uploadResult.imageUrl())
                    .type(ImageType.GALLERY)
                    .review(review)
                    .build();
            review.getImages().add(image);
        }

        // Cập nhật nội dung và thời điểm ghi gần nhất.
        review.setFoodQuantity(request.foodQuantity());
        review.setServiceQuantity(request.serviceQuantity());
        review.setSpace(request.space());
        review.setCleanliness(request.cleanliness());
        review.setContent(request.content());
        review.setCreatedAt(LocalDateTime.now());

        // Lưu thay đổi và trả đánh giá cùng ảnh sau cập nhật.
        Review savedReview = reviewRepository.saveAndFlush(review);

        // Xóa top 3 sau khi cập nhật đánh giá thành công.
        eventPublisher.publishEvent(new CacheInvalidationEvent(Set.of(FEATURED_EATERIES)));

        List<ReviewImageResponse> imageResponses = savedReview.getImages().stream()
                .map(image -> new ReviewImageResponse(image.getId(), image.getUrl()))
                .toList();
        return toReviewResponse(savedReview, imageResponses);
    }

    @Override
    @Transactional
    public void deleteCurrentUserReview(Long eateryId, String email) {
        // Kiểm tra quán và tìm đánh giá của người đăng nhập.
        ensurePublicEateryExists(eateryId);
        Review review = reviewRepository.findCurrentUserReview(eateryId, email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Không tìm thấy đánh giá của bạn"));

        // Đăng ký xóa ảnh trên Cloudinary sau khi commit thành công.
        List<String> publicIds = review.getImages().stream()
                .map(Image::getPublicId)
                .toList();
        cloudinaryService.registerCommitCleanup(publicIds);

        // Xóa đánh giá và các bản ghi ảnh liên quan bằng cascade.
        reviewRepository.delete(review);

        // Xóa top 3 sau khi xóa đánh giá thành công.
        eventPublisher.publishEvent(new CacheInvalidationEvent(Set.of(FEATURED_EATERIES)));
    }

    @Override
    @Transactional
    public Optional<ReviewResponse> getCurrentUserReview(Long eateryId, String email) {
        // Kiểm tra quán đang được công khai.
        ensurePublicEateryExists(eateryId);

        // Lấy review của người đăng nhập và ảnh đính kèm nếu có.
        return reviewRepository.findCurrentUserReview(eateryId, email).map(review -> {
            List<ReviewImageResponse> images = imageRepository
                    .findReviewImages(List.of(review.getReviewID())).stream()
                    .map(image -> new ReviewImageResponse(image.getId(), image.getImageUrl()))
                    .toList();
            return toReviewResponse(review, images);
        });
    }

    @Override
    @Transactional
    public PageResponse<ReviewResponse> getPublicEateryReviews(
            Long eateryId, String viewerEmail, String sort, int page, int size) {
        // Kiểm tra quán và phân trang review, loại người xem ngay tại DB.
        ensurePublicEateryExists(eateryId);
        Page<Review> reviewPage = reviewRepository.findReviews(
                eateryId, viewerEmail, sort, PageRequest.of(page, size));

        // Lấy và gom ảnh của các review thuộc trang hiện tại.
        List<Long> reviewIds = reviewPage.getContent().stream().map(Review::getReviewID).toList();
        Map<Long, List<ReviewImageResponse>> imagesByReviewId = new HashMap<>();
        if (!reviewIds.isEmpty()) {
            for (ReviewImageProjection image : imageRepository.findReviewImages(reviewIds)) {
                imagesByReviewId.computeIfAbsent(image.getReviewId(), key -> new ArrayList<>())
                        .add(new ReviewImageResponse(image.getId(), image.getImageUrl()));
            }
        }

        // Map review và giữ thông tin phân trang.
        Page<ReviewResponse> responsePage = reviewPage.map(review -> toReviewResponse(
                review, imagesByReviewId.getOrDefault(review.getReviewID(), List.of())));
        return new PageResponse<>(responsePage.getContent(), responsePage.getNumber(),
                responsePage.getSize(), responsePage.getTotalElements(), responsePage.getTotalPages());
    }

    private void ensurePublicEateryExists(Long eateryId) {
        if (!eateryRepository.existsByIdAndStatus(eateryId, EateryStatus.APPROVED)) {
            throw new ResourceNotFoundException("Không tìm thấy quán ăn");
        }
    }

    private ReviewResponse toReviewResponse(Review review, List<ReviewImageResponse> images) {
        User author = review.getSender();
        double averageRating = (review.getFoodQuantity() + review.getServiceQuantity()
                + review.getSpace() + review.getCleanliness()) / 4.0;
        return new ReviewResponse(
                review.getReviewID(), new ReviewAuthorResponse(author.getId(), author.getFullName()),
                review.getCreatedAt(), review.getFoodQuantity(), review.getServiceQuantity(),
                review.getSpace(), review.getCleanliness(), averageRating, review.getContent(), images);
    }
}

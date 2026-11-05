package ute.phuc.quanngon.service;

import org.springframework.web.multipart.MultipartFile;
import ute.phuc.quanngon.dto.Request.CreateReviewRequest;
import ute.phuc.quanngon.dto.Request.UpdateReviewRequest;
import ute.phuc.quanngon.dto.Response.PageResponse;
import ute.phuc.quanngon.dto.Response.ReviewResponse;

import java.util.List;
import java.util.Optional;

public interface ReviewService {
    ReviewResponse createReview(
            Long eateryId, String email,
            CreateReviewRequest request, List<MultipartFile> images);

    ReviewResponse updateCurrentUserReview(
            Long eateryId, String email,
            UpdateReviewRequest request, List<MultipartFile> images);

    void deleteCurrentUserReview(Long eateryId, String email);

    Optional<ReviewResponse> getCurrentUserReview(Long eateryId, String email);

    PageResponse<ReviewResponse> getPublicEateryReviews(
            Long eateryId, String viewerEmail, String sort, int page, int size);
}

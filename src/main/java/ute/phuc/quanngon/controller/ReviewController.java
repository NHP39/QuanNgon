package ute.phuc.quanngon.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Encoding;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.SchemaProperty;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import ute.phuc.quanngon.dto.Request.CreateReviewRequest;
import ute.phuc.quanngon.dto.Request.UpdateReviewRequest;
import ute.phuc.quanngon.dto.Response.ReviewResponse;
import ute.phuc.quanngon.service.ReviewService;

import java.util.List;
import java.util.Optional;

@Tag(name = "Đánh giá")
@RestController
@RequestMapping("/api/eateries/{eateryId}/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @Operation(summary = "Gửi đánh giá quán ăn",
            description = "Mỗi người được đánh giá một lần cho mỗi quán, kể cả quán mình đăng. data là JSON, images là ảnh tùy chọn.")
    @ApiResponse(responseCode = "201", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ReviewResponse.class)))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @SecurityRequirement(name = "cookieAuth")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(
            mediaType = "multipart/form-data", encoding = @Encoding(name = "data", contentType = "application/json")))
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createReview(
            @PathVariable("eateryId") Long eateryId,
            @Valid @RequestPart("data") CreateReviewRequest request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                reviewService.createReview(eateryId, authentication.getName(), request, images));
    }

    @Operation(summary = "Chỉnh sửa đánh giá của mình")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ReviewResponse.class)))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @SecurityRequirement(name = "cookieAuth")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(
            mediaType = "multipart/form-data", encoding = @Encoding(name = "data", contentType = "application/json")))
    @PatchMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateCurrentUserReview(
            @PathVariable("eateryId") Long eateryId,
            @Valid @RequestPart("data") UpdateReviewRequest request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            Authentication authentication) {
        return ResponseEntity.ok(
                reviewService.updateCurrentUserReview(
                        eateryId, authentication.getName(), request, images));
    }

    @Operation(summary = "Xóa đánh giá của mình")
    @ApiResponse(responseCode = "204", description = "Thành công, không có nội dung", content = @Content)
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @SecurityRequirement(name = "cookieAuth")
    @DeleteMapping("/me")
    public ResponseEntity<?> deleteCurrentUserReview(
            @PathVariable("eateryId") Long eateryId,
            Authentication authentication) {
        reviewService.deleteCurrentUserReview(eateryId, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Lấy đánh giá của mình",
            description = "Trả 204 nếu chưa có đánh giá.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ReviewResponse.class)))
    @ApiResponse(responseCode = "204", description = "Chưa có đánh giá", content = @Content)
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @SecurityRequirement(name = "cookieAuth")
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUserReview(
            @PathVariable("eateryId") Long eateryId,
            Authentication authentication) {

        Optional<ReviewResponse> currentUserReview =
                reviewService.getCurrentUserReview(eateryId, authentication.getName());

        if (currentUserReview.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(currentUserReview.get());
    }

    @Operation(summary = "Lấy danh sách đánh giá phân trang",
            description = "Nếu đã đăng nhập, loại đánh giá của người gọi khỏi danh sách để tránh trùng với đánh giá ghim. FE tải thêm bằng cách tăng page.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(type = "object"),
                schemaProperties = {
                        @SchemaProperty(name = "content", array = @ArraySchema(schema = @Schema(implementation = ReviewResponse.class))),
                        @SchemaProperty(name = "page", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "size", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "totalElements", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "totalPages", schema = @Schema(type = "integer"))}))
    @GetMapping
    public ResponseEntity<?> getPublicEateryReviews(
            @PathVariable("eateryId") Long eateryId,

            @RequestParam(defaultValue = "newest")
            @Pattern(regexp = "newest|highest|lowest",
                    message = "sort chỉ nhận newest, highest hoặc lowest")
            String sort,

            @RequestParam(defaultValue = "0")
            @Min(value = 0, message = "page phải lớn hơn hoặc bằng 0")
            int page,

            @RequestParam(defaultValue = "5")
            @Min(value = 1, message = "size phải lớn hơn hoặc bằng 1")
            @Max(value = 20, message = "size không được vượt quá 20")
            int size,

            Authentication authentication) {

        String viewerEmail = authentication == null ? null : authentication.getName();

        return ResponseEntity.ok(
                reviewService.getPublicEateryReviews(eateryId, viewerEmail, sort, page, size));
    }
}

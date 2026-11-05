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
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ute.phuc.quanngon.dto.Request.CreateEateryRequest;
import ute.phuc.quanngon.dto.Response.EateryCardResponse;
import ute.phuc.quanngon.dto.Response.EateryDetailResponse;
import ute.phuc.quanngon.dto.Response.EateryResponse;
import ute.phuc.quanngon.service.EateryService;

import java.util.List;

@Tag(name = "Quán ăn công khai")
@RestController
@RequestMapping("/api/eateries")
@RequiredArgsConstructor
public class EateryController {

    private final EateryService eateryService;

    @Operation(summary = "Lấy chi tiết quán đã duyệt")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = EateryDetailResponse.class)))
    @GetMapping("/{id}")
    public ResponseEntity<?> getPublicEateryDetail(
            @PathVariable("id") Long eateryId) {
        return ResponseEntity.ok(
                eateryService.getPublicEateryDetail(eateryId));
    }

    @Operation(summary = "Lấy tỉnh/thành có quán đã duyệt")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", array = @ArraySchema(schema = @Schema(implementation = String.class))))
    @GetMapping("/provinces")
    public ResponseEntity<?> getPublicEateryProvinces() {
        return ResponseEntity.ok(
                eateryService.getPublicEateryProvinces());
    }

    @Operation(summary = "Tìm kiếm, lọc và phân trang quán ăn",
            description = "Chỉ quán APPROVED. sort=newest: mới nhất; highestRated: chỉ quán có đánh giá, điểm trung bình giảm dần. Trang chủ dùng highestRated và size=3. Guest nhận favorite=false.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(type = "object"),
                schemaProperties = {
                        @SchemaProperty(name = "content", array = @ArraySchema(schema = @Schema(implementation = EateryCardResponse.class))),
                        @SchemaProperty(name = "page", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "size", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "totalElements", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "totalPages", schema = @Schema(type = "integer"))}))
    @GetMapping
    public ResponseEntity<?> getPublicEateries(
            @RequestParam(required= false) String q,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String province,

            @RequestParam(defaultValue = "newest")
            @Pattern(regexp = "newest|highestRated", message = "sort chỉ nhận newest hoặc highestRated")
            String sort,

            @RequestParam(defaultValue = "0")
            @Min(value = 0, message = "page phải lớn hơn hoặc bằng 0")
            int page,

            @RequestParam(defaultValue = "8")
            @Min(value = 1, message = "size phải lớn hơn hoặc bằng 1")
            @Max(value = 100, message = "size không được vượt quá 100")
            int size,
            Authentication authentication
        ) {
        String viewerEmail = null;
        if (authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {
            viewerEmail = authentication.getName();
        }
        return ResponseEntity.ok(
                eateryService.getPublicEateries(q, categoryId, province, sort, page, size, viewerEmail));
    }

    @Operation(summary = "Đăng quán ăn",
            description = "data là JSON, thumbnail là ảnh đại diện bắt buộc, gallery là các ảnh của quán. Quán mới có trạng thái PENDING.")
    @ApiResponse(responseCode = "201", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = EateryResponse.class)))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @SecurityRequirement(name = "cookieAuth")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(
            mediaType = "multipart/form-data", encoding = @Encoding(name = "data", contentType = "application/json")))
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createEatery(
            @Valid @RequestPart("data") CreateEateryRequest request,
            @RequestPart("thumbnail") MultipartFile thumbnail,
            @RequestPart(value = "gallery", required = false)
            List<MultipartFile> gallery,
            Authentication authentication) {

        String email = authentication.getName();

        EateryResponse response = eateryService.createEatery(
                request,
                thumbnail,
                gallery,
                email
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }
}

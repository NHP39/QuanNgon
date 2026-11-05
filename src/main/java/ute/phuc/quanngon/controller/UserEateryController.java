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
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import ute.phuc.quanngon.dto.Request.UpdateEateryVisibilityRequest;
import ute.phuc.quanngon.dto.Request.UpdateMyEateryRequest;
import ute.phuc.quanngon.dto.Response.MyEateryResponse;
import ute.phuc.quanngon.enums.EateryStatus;
import ute.phuc.quanngon.service.EateryService;

import java.util.List;

@Tag(name = "Quán đã chia sẻ")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/users/me/eateries")
@RequiredArgsConstructor
public class UserEateryController {

    private final EateryService eateryService;

    @Operation(summary = "Lấy quán đã chia sẻ theo trạng thái")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(type = "object"),
                schemaProperties = {
                        @SchemaProperty(name = "content", array = @ArraySchema(schema = @Schema(implementation = MyEateryResponse.class))),
                        @SchemaProperty(name = "page", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "size", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "totalElements", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "totalPages", schema = @Schema(type = "integer"))}))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @GetMapping
    public ResponseEntity<?> getMyEateries(
            Authentication authentication,
            @RequestParam(required = false) EateryStatus status,
            @RequestParam(defaultValue = "0")
            @Min(value = 0, message = "page phải lớn hơn hoặc bằng 0") int page,
            @RequestParam(defaultValue = "10")
            @Min(value = 1, message = "size phải lớn hơn hoặc bằng 1")
            @Max(value = 100, message = "size không được vượt quá 100") int size) {
        return ResponseEntity.ok(
                eateryService.getMyEateries(authentication.getName(), status, page, size));
    }

    @Operation(summary = "Lấy chi tiết quán mình đăng")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = MyEateryResponse.class)))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @GetMapping("/{id}")
    public ResponseEntity<?> getMyEateryDetail(
            @PathVariable("id") Long eateryId,
            Authentication authentication) {
        return ResponseEntity.ok(
                eateryService.getMyEateryDetail(eateryId, authentication.getName()));
    }

    @Operation(summary = "Sửa quán đang chờ duyệt",
            description = "Chỉ chủ bài đăng được sửa quán PENDING. Gửi version hiện tại để kiểm tra xung đột.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = MyEateryResponse.class)))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(
            mediaType = "multipart/form-data", encoding = @Encoding(name = "data", contentType = "application/json")))
    @PatchMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateMyEatery(
            @PathVariable("id") Long eateryId,
            Authentication authentication,
            @Valid @RequestPart("data") UpdateMyEateryRequest request,
            @RequestPart(value = "thumbnail", required = false) MultipartFile thumbnail,
            @RequestPart(value = "gallery", required = false) List<MultipartFile> gallery) {
        return ResponseEntity.ok(
                eateryService.updateMyEatery(
                        eateryId, authentication.getName(), request, thumbnail, gallery));
    }

    @Operation(summary = "Ẩn hoặc bỏ ẩn quán mình đăng",
            description = "Chuyển APPROVED ↔ HIDDEN. Gửi version hiện tại.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = MyEateryResponse.class)))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @PatchMapping("/{id}/visibility")
    public ResponseEntity<?> updateMyEateryVisibility(
            @PathVariable("id") Long eateryId,
            Authentication authentication,
            @Valid @RequestBody UpdateEateryVisibilityRequest request) {
        return ResponseEntity.ok(
                eateryService.updateMyEateryVisibility(eateryId, authentication.getName(), request));
    }

    @Operation(summary = "Xóa quán mình đăng",
            description = "Cho phép xóa cả quán đã có đánh giá.")
    @ApiResponse(responseCode = "204", description = "Thành công, không có nội dung", content = @Content)
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMyEatery(
            @PathVariable("id") Long eateryId,
            Authentication authentication) {
        eateryService.deleteMyEatery(eateryId, authentication.getName());
        return ResponseEntity.noContent().build();
    }
}

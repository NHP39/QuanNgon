package ute.phuc.quanngon.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.SchemaProperty;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ute.phuc.quanngon.dto.Request.UpdateEateryStatusRequest;
import ute.phuc.quanngon.dto.Response.AdminEateryResponse;
import ute.phuc.quanngon.enums.EateryStatus;
import ute.phuc.quanngon.service.EateryService;

@Tag(name = "Admin · Quán ăn")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/admin/eateries")
@RequiredArgsConstructor
public class AdminEateryController {

    private final EateryService eateryService;

    @Operation(summary = "Lấy danh sách quán theo trạng thái",
            description = "q tìm trong tên hoặc nội dung của quán thuộc trạng thái đang chọn. counts đếm toàn bộ quán theo bốn trạng thái.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(type = "object"),
                schemaProperties = {
                        @SchemaProperty(name = "content", array = @ArraySchema(schema = @Schema(implementation = AdminEateryResponse.class))),
                        @SchemaProperty(name = "page", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "size", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "totalElements", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "totalPages", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "counts", schema = @Schema(type = "object", additionalPropertiesSchema = Long.class))}))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @ApiResponse(responseCode = "403", description = "Cần quyền ADMIN", content = @Content)
    @GetMapping
    public ResponseEntity<?> getEateriesByStatus(
            @RequestParam(required = true) EateryStatus status,
            @RequestParam(required= false) String q,

            @RequestParam(defaultValue = "0")
            @Min(value = 0, message = "page phải lớn hơn hoặc bằng 0")
            int page,

            @RequestParam(defaultValue = "8")
            @Min(value = 1, message = "size phải lớn hơn hoặc bằng 1")
            @Max(value = 100, message = "size không được vượt quá 100")
            int size
        ) {

        return ResponseEntity.ok(
                eateryService.getEateryByStatus(status, q, page, size));
    }

    @Operation(summary = "Duyệt hoặc từ chối quán",
            description = "PENDING → APPROVED/REJECTED; REJECTED → APPROVED. Từ chối bắt buộc reason sau strip dài 10–500 ký tự. Gửi version để kiểm tra xung đột.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = AdminEateryResponse.class)))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @ApiResponse(responseCode = "403", description = "Cần quyền ADMIN", content = @Content)
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable("id") Long eateryId,
            @Valid @RequestBody UpdateEateryStatusRequest request
    ) {
        return ResponseEntity.ok(
                eateryService.updateEateryStatus(eateryId, request));
    }
}

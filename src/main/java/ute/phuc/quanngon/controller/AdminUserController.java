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
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ute.phuc.quanngon.dto.Request.UpdateUserStatusRequest;
import ute.phuc.quanngon.dto.Response.AdminUserPageResponse;
import ute.phuc.quanngon.dto.Response.AdminUserResponse;
import ute.phuc.quanngon.dto.Response.AdminUserSummaryResponse;
import ute.phuc.quanngon.service.UserService;

@Tag(name = "Admin · Người dùng")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;

    @Operation(summary = "Tìm kiếm và lọc người dùng",
            description = "Chỉ tài khoản USER. active để trống: tất cả; true: hoạt động; false: bị khóa. sortDir sắp xếp theo thời gian tạo tài khoản.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(type = "object"),
                schemaProperties = {
                        @SchemaProperty(name = "content", array = @ArraySchema(schema = @Schema(implementation = AdminUserResponse.class))),
                        @SchemaProperty(name = "page", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "size", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "totalElements", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "totalPages", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "summary", schema = @Schema(implementation = AdminUserSummaryResponse.class))}))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @ApiResponse(responseCode = "403", description = "Cần quyền ADMIN", content = @Content)
    @GetMapping
    public ResponseEntity<?> getAdminUsers(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean active,

            @RequestParam(defaultValue = "desc")
            @Pattern(regexp = "(?i)asc|desc",
                    message = "sortDir chỉ nhận asc hoặc desc")
            String sortDir,

            @RequestParam(defaultValue = "0")
            @Min(value = 0, message = "page phải lớn hơn hoặc bằng 0")
            int page,

            @RequestParam(defaultValue = "8")
            @Min(value = 1, message = "size phải lớn hơn hoặc bằng 1")
            @Max(value = 100, message = "size không được vượt quá 100")
            int size
        ) {

        return ResponseEntity.ok(
                userService.getAdminUsers(q, active, sortDir, page, size));
    }

    @Operation(summary = "Khóa hoặc mở khóa tài khoản",
            description = "Vô hiệu hóa phiên đăng nhập cũ; mở khóa không khôi phục phiên trước đó.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = AdminUserResponse.class)))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @ApiResponse(responseCode = "403", description = "Cần quyền ADMIN", content = @Content)
    @PatchMapping("/{id}/status")
    public ResponseEntity<AdminUserResponse> updateUserStatus(
            @PathVariable("id") Long userId,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        return ResponseEntity.ok(
                userService.updateUserStatus(userId, request));
    }
}

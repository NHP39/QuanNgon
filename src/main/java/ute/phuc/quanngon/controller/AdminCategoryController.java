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
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ute.phuc.quanngon.dto.Request.CategoryNameRequest;
import ute.phuc.quanngon.dto.Response.AdminCategoryPageResponse;
import ute.phuc.quanngon.dto.Response.AdminCategoryResponse;
import ute.phuc.quanngon.dto.Response.AdminCategorySummaryResponse;
import ute.phuc.quanngon.service.CategoryService;

@Tag(name = "Admin · Danh mục")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
public class AdminCategoryController {

    private final CategoryService categoryService;

    @Operation(summary = "Tìm kiếm và phân trang danh mục")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(type = "object"),
                schemaProperties = {
                        @SchemaProperty(name = "content", array = @ArraySchema(schema = @Schema(implementation = AdminCategoryResponse.class))),
                        @SchemaProperty(name = "page", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "size", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "totalElements", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "totalPages", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "summary", schema = @Schema(implementation = AdminCategorySummaryResponse.class))}))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @ApiResponse(responseCode = "403", description = "Cần quyền ADMIN", content = @Content)
    @GetMapping
    public ResponseEntity<?> getAdminCategories(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "7") @Min(1) @Max(100) int size) {
        return ResponseEntity.ok(
                categoryService.getAdminCategories(q, page, size));
    }

    @Operation(summary = "Thêm danh mục")
    @ApiResponse(responseCode = "201", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = AdminCategoryResponse.class)))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @ApiResponse(responseCode = "403", description = "Cần quyền ADMIN", content = @Content)
    @PostMapping
    public ResponseEntity<?> createCategory(
            @Valid @RequestBody CategoryNameRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(categoryService.createCategory(request));
    }

    @Operation(summary = "Đổi tên danh mục")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = AdminCategoryResponse.class)))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @ApiResponse(responseCode = "403", description = "Cần quyền ADMIN", content = @Content)
    @PatchMapping("/{id}")
    public ResponseEntity<?> updateCategory(
            @PathVariable("id") @Positive Long categoryId,
            @Valid @RequestBody CategoryNameRequest request) {
        return ResponseEntity.ok(categoryService.updateCategory(categoryId, request));
    }

    @Operation(summary = "Xóa danh mục chưa được sử dụng")
    @ApiResponse(responseCode = "204", description = "Thành công, không có nội dung", content = @Content)
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @ApiResponse(responseCode = "403", description = "Cần quyền ADMIN", content = @Content)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(
            @PathVariable("id") @Positive Long categoryId) {
        categoryService.deleteCategory(categoryId);
        return ResponseEntity.noContent().build();
    }
}

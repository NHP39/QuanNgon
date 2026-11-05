package ute.phuc.quanngon.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.SchemaProperty;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ute.phuc.quanngon.dto.Response.EateryCardResponse;
import ute.phuc.quanngon.service.FavoriteService;

@Tag(name = "Quán yêu thích")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/users/me/favorites")
@RequiredArgsConstructor
public class UserFavoriteController {
    private final FavoriteService favoriteService;

    @Operation(summary = "Thêm quán vào yêu thích",
            description = "Gọi lại cho quán đã yêu thích vẫn thành công; chỉ thêm quán APPROVED.")
    @ApiResponse(responseCode = "204", description = "Thành công, không có nội dung", content = @Content)
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @PutMapping("/{eateryId}")
    public ResponseEntity<?> addFavorite(
            @PathVariable("eateryId") Long eateryId,
            Authentication authentication) {
        favoriteService.addFavorite(eateryId, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Bỏ yêu thích")
    @ApiResponse(responseCode = "204", description = "Thành công, không có nội dung", content = @Content)
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @DeleteMapping("/{eateryId}")
    public ResponseEntity<?> removeFavorite(
            @PathVariable("eateryId") Long eateryId,
            Authentication authentication) {
        favoriteService.removeFavorite(eateryId, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Lấy quán yêu thích phân trang",
            description = "Chỉ hiển thị quán còn APPROVED. Mặc định 6 quán/trang.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(type = "object"),
                schemaProperties = {
                        @SchemaProperty(name = "content", array = @ArraySchema(schema = @Schema(implementation = EateryCardResponse.class))),
                        @SchemaProperty(name = "page", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "size", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "totalElements", schema = @Schema(type = "integer")),
                        @SchemaProperty(name = "totalPages", schema = @Schema(type = "integer"))}))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @GetMapping
    public ResponseEntity<?> getMyFavorites(
            Authentication authentication,
            @RequestParam(defaultValue = "0")
            @Min(value = 0, message = "page phải lớn hơn hoặc bằng 0") int page,
            @RequestParam(defaultValue = "6")
            @Min(value = 1, message = "size phải lớn hơn hoặc bằng 1")
            @Max(value = 100, message = "size không được vượt quá 100") int size) {
        return ResponseEntity.ok(favoriteService.getMyFavorites(authentication.getName(), page, size));
    }
}

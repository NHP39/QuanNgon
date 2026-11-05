package ute.phuc.quanngon.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ute.phuc.quanngon.dto.Response.EateryStatusStatisticsResponse;
import ute.phuc.quanngon.dto.Response.PostStatisticsResponse;
import ute.phuc.quanngon.dto.Response.UserRegistrationStatisticsResponse;
import ute.phuc.quanngon.service.DashboardService;

@Tag(name = "Admin · Tổng quan")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final DashboardService dashboardService;

    @Operation(summary = "Thống kê bài đăng mới theo ngày",
            description = "Chọn 7, 30 hoặc 90 ngày, tính cả hôm nay theo múi giờ cấu hình. Ngày không có bài đăng trả 0.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = PostStatisticsResponse.class)))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @ApiResponse(responseCode = "403", description = "Cần quyền ADMIN", content = @Content)
    @GetMapping("/posts")
    public ResponseEntity<PostStatisticsResponse> getPostStatistics(
            @RequestParam(name = "days", defaultValue = "30")
            @Pattern(
                    regexp = "7|30|90",
                    message = "Khoảng thống kê phải là 7, 30 hoặc 90 ngày")
            String days) {
        return ResponseEntity.ok(
                dashboardService.getPostStatistics(Integer.parseInt(days)));
    }

    @Operation(summary = "Thống kê tổng quán và bốn trạng thái")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = EateryStatusStatisticsResponse.class)))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @ApiResponse(responseCode = "403", description = "Cần quyền ADMIN", content = @Content)
    @GetMapping("/eatery-statuses")
    public ResponseEntity<EateryStatusStatisticsResponse> getEateryStatusStatistics() {
        return ResponseEntity.ok(
                dashboardService.getEateryStatusStatistics());
    }

    @Operation(summary = "Thống kê người đăng ký mới theo ngày",
            description = "Chỉ tài khoản USER đã xác thực email; chọn 7, 30 hoặc 90 ngày, tính cả hôm nay theo múi giờ cấu hình.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = UserRegistrationStatisticsResponse.class)))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @ApiResponse(responseCode = "403", description = "Cần quyền ADMIN", content = @Content)
    @GetMapping("/users")
    public ResponseEntity<UserRegistrationStatisticsResponse>
            getUserRegistrationStatistics(
                    @RequestParam(name = "days", defaultValue = "30")
                    @Pattern(
                            regexp = "7|30|90",
                            message = "Khoảng thống kê phải là 7, 30 hoặc 90 ngày")
                    String days) {

        return ResponseEntity.ok(
                dashboardService.getUserRegistrationStatistics(
                        Integer.parseInt(days)));
    }
}

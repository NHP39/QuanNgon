package ute.phuc.quanngon.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.SchemaProperty;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import ute.phuc.quanngon.dto.Request.ChangePasswordRequest;
import ute.phuc.quanngon.dto.Request.ForgotPasswordRequest;
import ute.phuc.quanngon.dto.Request.ResetPasswordRequest;
import ute.phuc.quanngon.dto.Request.LoginRequest;
import ute.phuc.quanngon.dto.Request.RegisterRequest;
import ute.phuc.quanngon.dto.Request.ResendOtpRequest;
import ute.phuc.quanngon.dto.Request.VerifyOtpRequest;
import ute.phuc.quanngon.dto.Response.ErrorResponse;
import ute.phuc.quanngon.dto.Response.OtpResponse;
import ute.phuc.quanngon.dto.Response.PasswordResetOtpStatusResponse;
import ute.phuc.quanngon.dto.UserInfo;
import ute.phuc.quanngon.service.AuthRateLimitService;
import ute.phuc.quanngon.service.AuthService;

import java.util.Map;

@Tag(name = "Xác thực")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthRateLimitService authRateLimitService;

    @Operation(summary = "Kiểm tra trạng thái OTP đặt lại mật khẩu",
            description = "Trả thời hạn OTP và thời gian chờ gửi lại; không tạo hoặc gửi mã.")
    @ApiResponse(responseCode = "200", description = "Đã lấy trạng thái OTP", content = @Content(
            mediaType = "application/json", schema = @Schema(implementation = PasswordResetOtpStatusResponse.class)))
    @PostMapping("/password-reset/otp-status")
    public ResponseEntity<?> getPasswordResetOtpStatus(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(
                authService.getPasswordResetOtpStatus(request, httpRequest.getRemoteAddr()));
    }

    @Operation(summary = "Yêu cầu OTP đặt lại mật khẩu",
            description = "Kiểm tra email rồi gửi OTP ở nền; mã có hạn và chỉ dùng một lần. Có giới hạn gửi và thời gian chờ 60 giây.")
    @ApiResponse(responseCode = "200", description = "Đã tiếp nhận yêu cầu", content = @Content(
            mediaType = "application/json", schema = @Schema(implementation = OtpResponse.class)))
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest) {
        authRateLimitService.checkPasswordResetOtpSend(request.email(), httpRequest.getRemoteAddr());
        return ResponseEntity.ok(authService.forgotPassword(request));
    }

    @Operation(summary = "Đặt lại mật khẩu bằng OTP",
            description = "Kiểm tra email, OTP và xác nhận mật khẩu. Thành công vô hiệu hóa phiên cũ, không tự đăng nhập hoặc xóa cookie.")
    @ApiResponse(responseCode = "200", description = "Đã đặt lại mật khẩu", content = @Content(
            mediaType = "application/json", schema = @Schema(type = "object"), schemaProperties = {
            @SchemaProperty(name = "message", schema = @Schema(type = "string"))}))
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest httpRequest) {
        authRateLimitService.checkPasswordResetOtpVerify(request.email(), httpRequest.getRemoteAddr());
        authService.resetPassword(request);
        return ResponseEntity.ok(Map.of(
                "message", "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."));
    }

    @Operation(summary = "Đăng nhập",
            description = "Tối đa 10 request/email và 30 request/IP trong 15 phút. Cấp cookie access_token và refresh_token sau khi commit.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = UserInfo.class)))
    @ApiResponse(responseCode = "429", description = "Vượt giới hạn request",
            headers = @Header(name = "Retry-After", description = "Số giây cần chờ", schema = @Schema(type = "integer")),
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                                  HttpServletRequest httpRequest, HttpServletResponse response) {

        authRateLimitService.checkLogin(request.email(), httpRequest.getRemoteAddr());

        UserInfo userInfo = authService.login(request, response);

        return ResponseEntity.ok()
                .body(userInfo);
    }

    @Operation(summary = "Lấy thông tin tài khoản đang đăng nhập")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = UserInfo.class)))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @SecurityRequirement(name = "cookieAuth")
    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        UserInfo info = authService.me(authentication);

        return ResponseEntity.ok()
                .body(info);
    }

    @Operation(summary = "Đổi mật khẩu",
            description = "Kiểm tra mật khẩu hiện tại, mật khẩu mới và xác nhận. Thành công sẽ vô hiệu hóa phiên cũ và xóa cookie.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(type = "object"),
                schemaProperties = @SchemaProperty(name = "message", schema = @Schema(type = "string"))))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @SecurityRequirement(name = "cookieAuth")
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletResponse response) {
        authService.changePassword(authentication, request, response);
        return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công. Vui lòng đăng nhập lại."));
    }

    @Operation(summary = "Đăng xuất")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(type = "object"),
                schemaProperties = @SchemaProperty(name = "message", schema = @Schema(type = "string"))))
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {

        authService.logout(request, response);

        return ResponseEntity.ok(Map.of("message", "Đăng xuất thành công"));
    }

    @Operation(summary = "Cấp lại access token",
            description = "Dùng cookie refresh_token còn hiệu lực; không cần access token còn hạn.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(type = "object"),
                schemaProperties = @SchemaProperty(name = "message", schema = @Schema(type = "string"))))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @SecurityRequirement(name = "refreshCookie")
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest request, HttpServletResponse response) {

        authService.refresh(request, response);

        return ResponseEntity.ok(Map.of("message", "Refresh thành công"));
    }

    @Operation(summary = "Đăng ký tài khoản và gửi OTP",
            description = "Dùng chung giới hạn với gửi lại OTP: 5 request/email/giờ, 20 request/IP/giờ; chờ 60 giây giữa hai yêu cầu.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = OtpResponse.class)))
    @ApiResponse(responseCode = "429", description = "Vượt giới hạn request",
            headers = @Header(name = "Retry-After", description = "Số giây cần chờ", schema = @Schema(type = "integer")),
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {

        authRateLimitService.checkOtpSend(request.email(), httpRequest.getRemoteAddr());

        OtpResponse otpResponse = authService.register(request);

        return ResponseEntity.ok()
                .body(otpResponse);
    }

    @Operation(summary = "Xác thực OTP",
            description = "Tối đa 5 request/email và 30 request/IP trong 5 phút.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(type = "object"),
                schemaProperties = @SchemaProperty(name = "message", schema = @Schema(type = "string"))))
    @ApiResponse(responseCode = "429", description = "Vượt giới hạn request",
            headers = @Header(name = "Retry-After", description = "Số giây cần chờ", schema = @Schema(type = "integer")),
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest request, HttpServletRequest httpRequest) {
        authRateLimitService.checkOtpVerify(request.email(), httpRequest.getRemoteAddr());
        Map<String, String> response = authService.verifyOtp(request);
        return ResponseEntity.ok()
                .body(response);
    }

    @Operation(summary = "Gửi lại OTP",
            description = "Chỉ tài khoản đang hoạt động, chưa xác thực email. Dùng chung giới hạn với đăng ký.")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = OtpResponse.class)))
    @ApiResponse(responseCode = "429", description = "Vượt giới hạn request",
            headers = @Header(name = "Retry-After", description = "Số giây cần chờ", schema = @Schema(type = "integer")),
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@Valid @RequestBody ResendOtpRequest request, HttpServletRequest httpRequest) {

        authRateLimitService.checkOtpSend(request.email(), httpRequest.getRemoteAddr());
        OtpResponse otpResponse = authService.resendOtp(request);

        return ResponseEntity.ok()
                .body(otpResponse);
    }

}

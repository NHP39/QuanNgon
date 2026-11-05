package ute.phuc.quanngon.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ute.phuc.quanngon.dto.Request.UpdateUserInfoRequest;
import ute.phuc.quanngon.dto.Response.UpdateUserInfoResponse;
import ute.phuc.quanngon.service.UserService;

@Tag(name = "Tài khoản")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "Cập nhật họ tên")
    @ApiResponse(responseCode = "200", description = "Thành công", content = @Content(mediaType = "application/json", schema = @Schema(implementation = UpdateUserInfoResponse.class)))
    @ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc phiên hết hiệu lực", content = @Content)
    @PatchMapping("/me")
    public ResponseEntity<UpdateUserInfoResponse> updateUserInfo(
            Authentication authentication,
            @Valid @RequestBody UpdateUserInfoRequest request) {
        return ResponseEntity.ok(
                userService.updateUserInfo(authentication, request));
    }
}

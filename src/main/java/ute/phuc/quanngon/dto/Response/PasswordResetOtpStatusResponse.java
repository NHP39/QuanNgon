package ute.phuc.quanngon.dto.Response;

public record PasswordResetOtpStatusResponse(
        boolean otpActive,
        long expiresIn,
        long resendAfterSeconds
) {
}

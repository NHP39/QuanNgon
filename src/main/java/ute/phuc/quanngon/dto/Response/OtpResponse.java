package ute.phuc.quanngon.dto.Response;

public record OtpResponse(
        String message,
        String email,
        long expiresIn
) {
}

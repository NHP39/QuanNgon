package ute.phuc.quanngon.service;

public interface OtpService {
    String generateOtp();
    void saveOtp(String email, String otp);
    boolean verifyOtp(String email, String otp);
    void deleteOtp(String email);
    String savePasswordResetOtp(String email, String otp);
    boolean consumePasswordResetOtp(String email, String otp);
    boolean deletePasswordResetOtp(String email, String expectedOtpHash);
}

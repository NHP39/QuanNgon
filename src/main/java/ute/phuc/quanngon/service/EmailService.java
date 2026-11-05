package ute.phuc.quanngon.service;

public interface EmailService {
    void sendOtpMail(String email, String otp);
    void sendPasswordResetOtpMail(String email, String otp);
}

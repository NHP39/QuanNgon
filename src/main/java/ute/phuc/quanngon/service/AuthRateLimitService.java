package ute.phuc.quanngon.service;

public interface AuthRateLimitService {

    void checkLogin(String email, String ip);

    void checkOtpSend(String email, String ip);

    void checkOtpVerify(String email, String ip);

    void checkPasswordResetOtpSend(String email, String ip);

    long getPasswordResetOtpResendAfterSeconds(String email, String ip);

    void checkPasswordResetOtpVerify(String email, String ip);
}

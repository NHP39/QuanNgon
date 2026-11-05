package ute.phuc.quanngon.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import ute.phuc.quanngon.dto.Request.ChangePasswordRequest;
import ute.phuc.quanngon.dto.Request.ForgotPasswordRequest;
import ute.phuc.quanngon.dto.Request.ResetPasswordRequest;
import ute.phuc.quanngon.dto.Request.LoginRequest;
import ute.phuc.quanngon.dto.Request.RegisterRequest;
import ute.phuc.quanngon.dto.Request.ResendOtpRequest;
import ute.phuc.quanngon.dto.Request.VerifyOtpRequest;
import ute.phuc.quanngon.dto.Response.OtpResponse;
import ute.phuc.quanngon.dto.UserInfo;

import java.util.Map;

public interface AuthService {

    UserInfo login(LoginRequest request, HttpServletResponse response);
    UserInfo me(Authentication authentication);
    void changePassword(Authentication authentication, ChangePasswordRequest request, HttpServletResponse response);
    void logout(HttpServletRequest request, HttpServletResponse response);
    void refresh(HttpServletRequest request, HttpServletResponse response);
    OtpResponse register(RegisterRequest request);
    Map<String, String> verifyOtp(VerifyOtpRequest request);
    OtpResponse resendOtp(ResendOtpRequest request);
    OtpResponse forgotPassword(ForgotPasswordRequest request);
    void resetPassword(ResetPasswordRequest request);
}

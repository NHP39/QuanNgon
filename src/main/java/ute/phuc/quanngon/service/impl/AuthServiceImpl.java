package ute.phuc.quanngon.service.impl;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.task.AsyncTaskExecutor;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import ute.phuc.quanngon.dto.Request.ChangePasswordRequest;
import ute.phuc.quanngon.dto.Request.ForgotPasswordRequest;
import ute.phuc.quanngon.dto.Request.ResetPasswordRequest;
import ute.phuc.quanngon.dto.Request.LoginRequest;
import ute.phuc.quanngon.dto.Request.RegisterRequest;
import ute.phuc.quanngon.dto.Request.ResendOtpRequest;
import ute.phuc.quanngon.dto.Request.VerifyOtpRequest;
import ute.phuc.quanngon.dto.Response.OtpResponse;
import ute.phuc.quanngon.dto.UserInfo;
import ute.phuc.quanngon.config.OtpProperties;
import ute.phuc.quanngon.entity.Account;
import ute.phuc.quanngon.entity.RefreshToken;
import ute.phuc.quanngon.entity.User;
import ute.phuc.quanngon.event.CacheInvalidationEvent;
import ute.phuc.quanngon.enums.Role;
import ute.phuc.quanngon.exception.EmailAlreadyExistsException;
import ute.phuc.quanngon.exception.EmailNotVerifiedException;
import ute.phuc.quanngon.exception.InvalidOtpException;
import ute.phuc.quanngon.exception.InvalidPasswordException;
import ute.phuc.quanngon.exception.PasswordMismatchException;
import ute.phuc.quanngon.exception.ResourceNotFoundException;
import ute.phuc.quanngon.repository.AccountRepository;
import ute.phuc.quanngon.repository.RefreshTokenRepository;
import ute.phuc.quanngon.repository.UserRepository;
import ute.phuc.quanngon.security.CustomUserDetails;
import ute.phuc.quanngon.security.JwtService;
import ute.phuc.quanngon.service.AuthService;
import ute.phuc.quanngon.service.EmailService;
import ute.phuc.quanngon.service.OtpService;

import java.time.Instant;
import java.util.Map;
import java.util.Set;

import static ute.phuc.quanngon.config.RedisCacheConfig.DASHBOARD_USERS;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    @Value("${app.jwt.refresh-token-expiration-ms}")
    private long refreshTokenExpirationsMs;

    @Value("${app.jwt.access-token-expiration-ms}")
    private long accessTokenExpirationsMs;

    @Value("${app.security.cookie-secure:false}")
    private boolean cookieSecure;

    @Value("${app.security.cookie-same-site:Lax}")
    private String cookieSameSite;

    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AccountRepository accountRepository;
    private final OtpService otpService;
    private final OtpProperties otpProperties;
    private final EmailService emailService;
    private final ApplicationEventPublisher eventPublisher;
    private final AsyncTaskExecutor applicationTaskExecutor;

    @Override
    @Transactional
    public UserInfo login(LoginRequest request, HttpServletResponse response) {
        // Xác thực email và mật khẩu.
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email().strip(), request.password()));
        } catch (BadCredentialsException ex) {
            throw new BadCredentialsException("Tài khoản hoặc mật khẩu không chính xác!");
        }

        // Kiểm tra trạng thái tài khoản và xác thực email.
        CustomUserDetails principal = (CustomUserDetails) authentication.getPrincipal();
        Account account = principal.getAccount();
        if (!Boolean.TRUE.equals(account.getActive())) {
            throw new DisabledException("Tài khoản đã bị khóa");
        }
        if (!Boolean.TRUE.equals(account.getEmailVerified())) {
            throw new EmailNotVerifiedException("Email chưa được xác thực");
        }
        User user = userRepository.findByAccountEmail(account.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Không tìm thấy thông tin người dùng"));

        // Tạo phiên mới và xóa refresh token của phiên trước.
        account.setSessionVersion(account.getSessionVersion() + 1);
        accountRepository.save(account);
        refreshTokenRepository.deleteByAccountId(account.getId());

        // Cấp hai token cùng phiên và lưu refresh token.
        String accessToken = jwtService.generateAccessToken(
                user.getId(), account.getEmail(), account.getRole(), account.getSessionVersion());
        String refreshToken = jwtService.generateRefreshToken(
                user.getId(), account.getEmail(), account.getRole(), account.getSessionVersion());
        RefreshToken storedToken = new RefreshToken();
        storedToken.setRefreshToken(refreshToken);
        storedToken.setAccount(account);
        storedToken.setExpiryDate(Instant.now().plusMillis(refreshTokenExpirationsMs));
        refreshTokenRepository.save(storedToken);

        // Chỉ gửi cookie sau khi transaction commit thành công.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                addCookies(response, accessToken, refreshToken);
            }
        });

        return new UserInfo(user.getId(), account.getEmail(), user.getFullName(), account.getRole());
    }

    @Override
    public UserInfo me(Authentication authentication) {
        User user = userRepository.findByAccountEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy người dùng"));

        return new UserInfo(
                user.getId(),
                user.getAccount().getEmail(),
                user.getFullName(),
                user.getAccount().getRole());
    }

    @Override
    @Transactional
    public void changePassword(Authentication authentication, ChangePasswordRequest request, HttpServletResponse response) {
        // Tìm và kiểm tra tài khoản đang đăng nhập.
        Account account = accountRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new BadCredentialsException("Phiên đăng nhập không hợp lệ"));
        if (!Boolean.TRUE.equals(account.getActive())) {
            throw new DisabledException("Tài khoản đã bị khóa");
        }

        // Kiểm tra currentPass, newPassword và confirmPassword.
        if (!passwordEncoder.matches(request.currentPassword(), account.getPassword())) {
            throw new InvalidPasswordException("Mật khẩu hiện tại không chính xác");
        }
        if (passwordEncoder.matches(request.newPassword(), account.getPassword())) {
            throw new InvalidPasswordException("Mật khẩu mới phải khác mật khẩu hiện tại");
        }
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new PasswordMismatchException("Xác nhận mật khẩu mới không khớp");
        }

        // Lưu mật khẩu mới và vô hiệu hóa phiên cũ.
        account.setPassword(passwordEncoder.encode(request.newPassword()));
        account.setSessionVersion(account.getSessionVersion() + 1);
        accountRepository.save(account);
        refreshTokenRepository.deleteByAccountId(account.getId());

        // Chỉ xóa cookie sau khi transaction commit thành công.
        clearCookiesAfterCommit(response);
    }

    @Transactional
    @Override
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        // Đọc phiên đăng xuất từ token còn hợp lệ.
        Claims claims = readLogoutClaims(request);
        if (claims != null) {
            String email = claims.getSubject();
            Long tokenVersion;
            try {
                tokenVersion = claims.get("sessionVersion", Long.class);
            } catch (JwtException | IllegalArgumentException ex) {
                tokenVersion = null;
            }

            // Phiên cũ không được vô hiệu hóa phiên đăng nhập mới.
            if (email != null && !email.isBlank() && tokenVersion != null && tokenVersion >= 0) {
                Account account = accountRepository.findByEmail(email).orElse(null);
                if (account != null && tokenVersion.longValue() == account.getSessionVersion()) {
                    account.setSessionVersion(account.getSessionVersion() + 1);
                    accountRepository.save(account);
                    refreshTokenRepository.deleteByAccountId(account.getId());
                }
            }
        }

        // Luôn xóa cookie của trình duyệt sau khi commit.
        clearCookiesAfterCommit(response);
    }

    @Transactional
    @Override
    public void refresh(HttpServletRequest request, HttpServletResponse response) {

        String refreshToken = jwtService.getTokenFromCookie(request, "refresh_token");

        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BadCredentialsException("Không tìm thấy refresh token");
        }

        // Xác minh refresh token và thông tin phiên.
        String email;
        Long tokenVersion;
        try {
            Claims claims = jwtService.extractClaims(refreshToken, false);
            email = claims.getSubject();
            tokenVersion = claims.get("sessionVersion", Long.class);
        } catch (JwtException | IllegalArgumentException ex) {
            throw new BadCredentialsException("Refresh token không hợp lệ hoặc đã hết hạn");
        }

        if (email == null || email.isBlank() || tokenVersion == null || tokenVersion < 0) {
            throw new BadCredentialsException("Refresh token chứa thông tin phiên không hợp lệ");
        }

        // Kiểm tra bản ghi và hạn dùng của refresh token.
        RefreshToken storedToken = refreshTokenRepository.findByRefreshToken(refreshToken)
                .orElseThrow(() -> new BadCredentialsException("Refresh token không còn hiệu lực"));
        if (!storedToken.getExpiryDate().isAfter(Instant.now())) {
            throw new BadCredentialsException("Refresh token đã hết hạn");
        }

        // Kiểm tra tài khoản và phiên trước khi cấp access token mới.
        Account account = storedToken.getAccount();
        if (!Boolean.TRUE.equals(account.getActive())) {
            throw new DisabledException("Tài khoản đã bị khóa");
        }
        if (!account.getEmail().equals(email) || tokenVersion.longValue() != account.getSessionVersion()) {
            throw new BadCredentialsException("Phiên đăng nhập không còn hiệu lực");
        }
        User user = userRepository.findByAccountEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Không tìm thấy thông tin người dùng"));

        // Giữ nguyên phiên và refresh token, chỉ cấp access token mới.
        String newAccessToken = jwtService.generateAccessToken(
                user.getId(), email, account.getRole(), account.getSessionVersion());
        ResponseCookie accessCookie = buildCookie(
                "access_token", newAccessToken, accessTokenExpirationsMs / 1000, "/");
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
            }
        });
    }

    private Claims readLogoutClaims(HttpServletRequest request) {
        String refreshToken = jwtService.getTokenFromCookie(request, "refresh_token");
        if (refreshToken != null && !refreshToken.isBlank()) {
            try {
                return jwtService.extractClaims(refreshToken, false);
            } catch (JwtException | IllegalArgumentException ex) {
                // Thử access token nếu refresh token không còn hợp lệ.
            }
        }

        String accessToken = jwtService.getTokenFromCookie(request, "access_token");
        if (accessToken != null && !accessToken.isBlank()) {
            try {
                return jwtService.extractClaims(accessToken, true);
            } catch (JwtException | IllegalArgumentException ex) {
                // Token không hợp lệ chỉ cần xóa cookie tại trình duyệt.
            }
        }
        return null;
    }

    private void clearCookiesAfterCommit(HttpServletResponse response) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                clearCookies(response);
            }
        });
    }

    @Transactional
    @Override
    public OtpResponse register(RegisterRequest request) {

        String email = request.email().trim();

        // Kiểm tra email và mật khẩu xác nhận.
        if (accountRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("Email đã tồn tại");
        }

        if (!request.password().equals(request.confirmPassword())) {
            throw new PasswordMismatchException("Mật khẩu nhập lại không khớp");
        }

        // Tạo tài khoản chưa xác thực và thông tin người dùng.
        Account account = Account.builder()
                .email(email)
                .password(passwordEncoder.encode(request.password()))
                .role(Role.USER)
                .active(true)
                .emailVerified(false)
                .build();

        User user = User.builder()
                .fullName(request.fullName())
                .account(account)
                .build();

        account.setUser(user);
        accountRepository.save(account);

        // Lưu OTP và dọn mã nếu transaction đăng ký thất bại.
        String otp = otpService.generateOtp();
        otpService.saveOtp(email, otp);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) deleteOtpQuietly(email);
            }
        });

        // Gửi mã xác thực qua SMTP.
        emailService.sendOtpMail(email, otp);

        return new OtpResponse(
                "Đăng ký thành công. Mã OTP đã được gửi đến email.",
                email,
                otpProperties.getExpirationSeconds());

    }

    @Transactional
    @Override
    public Map<String, String> verifyOtp(VerifyOtpRequest request) {
        String email = request.email().trim();
        // Chỉ xác thực tài khoản còn hoạt động và chưa xác minh email.
        Account account = findUnverifiedAccount(email);
        if (!otpService.verifyOtp(email, request.otp())) {
            throw new InvalidOtpException("Mã OTP không chính xác hoặc đã hết hạn");
        }
        // Lưu trạng thái xác thực trước khi xóa mã OTP.
        account.setEmailVerified(true);
        accountRepository.save(account);

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteOtpQuietly(email);
            }
        });

        // Xóa cache thống kê người dùng sau khi xác thực email thành công.
        eventPublisher.publishEvent(new CacheInvalidationEvent(Set.of(DASHBOARD_USERS)));

        return Map.of("message", "Xác thực email thành công");
    }

    @Override
    public OtpResponse resendOtp(ResendOtpRequest request) {
        String email =  request.email().trim();

        // Kiểm tra tài khoản được phép nhận lại OTP.
        findUnverifiedAccount(email);

        // Tạo và lưu mã xác thực mới.
        String otp = otpService.generateOtp();
        otpService.saveOtp(email, otp);

        // Gửi mã qua SMTP và xóa mã vừa tạo nếu gửi thất bại.
        try {
            emailService.sendOtpMail(email, otp);
        } catch (RuntimeException ex) {
            deleteOtpQuietly(email);
            throw ex;
        }

        return new OtpResponse(
                "Mã OTP mới đã được gửi đến email.",
                email,
                otpProperties.getExpirationSeconds());
    }

    @Override
    public OtpResponse forgotPassword(ForgotPasswordRequest request) {
        // Kiểm tra email trong request để trả đúng lỗi trước khi gửi mail ở nền.
        String email = request.email();
        findPasswordResetAccount(email);
        String requestId = MDC.get("requestId");

        // Giữ mã request khi xử lý gửi OTP trên thread khác.
        applicationTaskExecutor.execute(() -> {
            try {
                if (requestId != null) MDC.put("requestId", requestId);
                sendPasswordResetOtp(email);
            } catch (RuntimeException ex) {
                log.error("Không thể xử lý yêu cầu gửi OTP đặt lại mật khẩu", ex);
            } finally {
                MDC.remove("requestId");
            }
        });

        return new OtpResponse(
                "Yêu cầu gửi mã OTP đã được tiếp nhận. Vui lòng kiểm tra email.",
                email, otpProperties.getExpirationSeconds());
    }

    private void sendPasswordResetOtp(String email) {
        // Kiểm tra lại tài khoản trước khi tạo mã trong tác vụ nền.
        findPasswordResetAccount(email);
        String otp = otpService.generateOtp();
        String otpHash = otpService.savePasswordResetOtp(email, otp);
        try {
            emailService.sendPasswordResetOtpMail(email, otp);
        } catch (RuntimeException ex) {
            try {
                otpService.deletePasswordResetOtp(email, otpHash);
            } catch (DataAccessException cleanupException) {
                log.warn("Không thể dọn OTP đặt lại mật khẩu; mã sẽ tự hết hạn", cleanupException);
            }
            throw ex;
        }
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        // Kiểm tra xác nhận mật khẩu trước khi sử dụng OTP.
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new PasswordMismatchException("Xác nhận mật khẩu mới không khớp");
        }

        // Kiểm tra email và trạng thái tài khoản riêng với lỗi OTP.
        Account account = findPasswordResetAccount(request.email());
        if (!otpService.consumePasswordResetOtp(request.email(), request.otp())) {
            throw new InvalidOtpException("Mã OTP không chính xác hoặc đã hết hạn");
        }

        // Lưu mật khẩu mới và vô hiệu hóa phiên cũ, không xóa cookie.
        account.setPassword(passwordEncoder.encode(request.newPassword()));
        account.setSessionVersion(account.getSessionVersion() + 1);
        accountRepository.save(account);
        refreshTokenRepository.deleteByAccountId(account.getId());
    }

    private Account findPasswordResetAccount(String email) {
        Account account = accountRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy tài khoản với email này"));
        if (!Boolean.TRUE.equals(account.getActive())) {
            throw new DisabledException("Tài khoản đã bị khóa");
        }
        if (!Boolean.TRUE.equals(account.getEmailVerified())) {
            throw new EmailNotVerifiedException("Email chưa được xác thực");
        }
        return account;
    }

    private Account findUnverifiedAccount(String email) {
        Account account = accountRepository.findByEmail(email)
                .orElseThrow(() -> new InvalidOtpException("Không tìm thấy tài khoản cần xác thực"));
        if (!Boolean.TRUE.equals(account.getActive())) {
            throw new DisabledException("Tài khoản đã bị khóa");
        }
        if (Boolean.TRUE.equals(account.getEmailVerified())) {
            throw new InvalidOtpException("Email đã được xác thực");
        }
        return account;
    }

    private void deleteOtpQuietly(String email) {
        try {
            otpService.deleteOtp(email);
        } catch (DataAccessException ex) {
            log.warn("Không thể dọn mã OTP; mã sẽ tự hết hạn theo TTL", ex);
        }
    }

    public void addCookies(HttpServletResponse response, String access_token, String refresh_token) {
        ResponseCookie accessCookie = buildCookie("access_token", access_token, accessTokenExpirationsMs / 1000, "/");
        ResponseCookie refreshCookie = buildCookie("refresh_token", refresh_token, refreshTokenExpirationsMs / 1000, "/api/auth");

        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
    }

    public void clearCookies(HttpServletResponse response) {
        ResponseCookie accessCookie = buildCookie("access_token", "", 0, "/");
        ResponseCookie refreshCookie = buildCookie("refresh_token", "", 0, "/api/auth");

        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
    }

    private ResponseCookie buildCookie(String name, String value, long maxAgeSeconds, String path) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(cookieSecure)
                .path(path)
                .sameSite(cookieSameSite)
                .maxAge(maxAgeSeconds)
                .build();
    }
}

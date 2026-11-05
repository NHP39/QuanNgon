package ute.phuc.quanngon.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import ute.phuc.quanngon.config.OtpProperties;
import ute.phuc.quanngon.service.OtpService;

import java.security.SecureRandom;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class OtpServiceImpl implements OtpService {

    private final StringRedisTemplate redisTemplate;
    private final OtpProperties otpProperties;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    private static final DefaultRedisScript<Long> DELETE_MATCHING_RESET_OTP =
            new DefaultRedisScript<>("""
                    if redis.call('GET', KEYS[1]) == ARGV[1] then
                        return redis.call('DEL', KEYS[1])
                    end
                    return 0
                    """, Long.class);

    @Override
    public String generateOtp() {
        return String.format("%06d", random.nextInt(1_000_000));
    }

    @Override
    public void saveOtp(String email, String otp) {
        redisTemplate.opsForValue().set(
                "register:otp:" + email,
                otp,
                otpProperties.getExpirationSeconds(),
                TimeUnit.SECONDS
        );
    }

    @Override
    public boolean verifyOtp(String email, String otp) {
        String key = "register:otp:" + email;
        String savedOtp =  redisTemplate.opsForValue().get(key);
        if (savedOtp == null) {
            return false;
        }
        return savedOtp.equals(otp);
    }

    @Override
    public void deleteOtp(String email) {
        String key = "register:otp:" + email;
        redisTemplate.delete(key);
    }

    @Override
    public String savePasswordResetOtp(String email, String otp) {
        // Lưu bản băm OTP đặt lại mật khẩu với thời hạn cấu hình.
        String otpHash = passwordEncoder.encode(otp);
        redisTemplate.opsForValue().set(
                passwordResetOtpKey(email), otpHash,
                otpProperties.getExpirationSeconds(), TimeUnit.SECONDS);
        return otpHash;
    }

    @Override
    public boolean consumePasswordResetOtp(String email, String otp) {
        // Kiểm tra mã rồi xóa nguyên tử để mỗi OTP chỉ được sử dụng một lần.
        String storedOtpHash = redisTemplate.opsForValue().get(passwordResetOtpKey(email));
        if (storedOtpHash == null || !passwordEncoder.matches(otp, storedOtpHash)) {
            return false;
        }
        return deletePasswordResetOtp(email, storedOtpHash);
    }

    @Override
    public boolean deletePasswordResetOtp(String email, String expectedOtpHash) {
        // Chỉ xóa đúng mã đã kiểm tra, giữ lại mã mới nếu có yêu cầu gửi lại.
        Long deleted = redisTemplate.execute(
                DELETE_MATCHING_RESET_OTP, List.of(passwordResetOtpKey(email)), expectedOtpHash);
        return Long.valueOf(1L).equals(deleted);
    }

    private String passwordResetOtpKey(String email) {
        return "password-reset:otp:" + email;
    }
}

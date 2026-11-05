package ute.phuc.quanngon.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import ute.phuc.quanngon.config.AuthRateLimitProperties;
import ute.phuc.quanngon.exception.TooManyRequestsException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthRateLimitService {

    private static final DefaultRedisScript<Long> CONSUME = new DefaultRedisScript<>("""
            local count = redis.call('INCR', KEYS[1])
            if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
            if count > tonumber(ARGV[1]) then return redis.call('TTL', KEYS[1]) end
            return 0
            """, Long.class);

    private final StringRedisTemplate redisTemplate;
    private final AuthRateLimitProperties properties;

    public void checkLogin(String email, String ip) {
        if (!properties.isEnabled()) return;
        consume("login:ip", ip, properties.getLoginMaxPerIp(), properties.getLoginWindowSeconds());
        consume("login:email", email, properties.getLoginMaxPerEmail(), properties.getLoginWindowSeconds());
    }

    public void checkOtpSend(String email, String ip) {
        if (!properties.isEnabled()) return;
        consume("otp-send:ip", ip, properties.getOtpSendMaxPerIp(), properties.getOtpSendWindowSeconds());
        consume("otp-send:email", email, properties.getOtpSendMaxPerEmail(), properties.getOtpSendWindowSeconds());

        String key = key("otp-cooldown:email", email);
        if (!Boolean.TRUE.equals(redisTemplate.opsForValue().setIfAbsent(
                key, "1", Duration.ofSeconds(properties.getOtpSendCooldownSeconds())))) {
            Long remaining = redisTemplate.getExpire(key);
            throw new TooManyRequestsException("Vui lòng chờ trước khi yêu cầu gửi lại OTP.",
                    remaining == null ? properties.getOtpSendCooldownSeconds() : remaining);
        }
    }

    public void checkOtpVerify(String email, String ip) {
        if (!properties.isEnabled()) return;
        consume("otp-verify:ip", ip, properties.getOtpVerifyMaxPerIp(), properties.getOtpVerifyWindowSeconds());
        consume("otp-verify:email", email, properties.getOtpVerifyMaxPerEmail(), properties.getOtpVerifyWindowSeconds());
    }

    public void checkPasswordResetOtpSend(String email, String ip) {
        if (!properties.isEnabled()) return;
        consume("password-reset-send:ip", ip,
                properties.getOtpSendMaxPerIp(), properties.getOtpSendWindowSeconds());
        consume("password-reset-send:email", email,
                properties.getOtpSendMaxPerEmail(), properties.getOtpSendWindowSeconds());

        // Tách thời gian chờ gửi mã khỏi luồng đăng ký.
        String cooldownKey = key("password-reset-cooldown:email", email);
        if (!Boolean.TRUE.equals(redisTemplate.opsForValue().setIfAbsent(
                cooldownKey, "1", Duration.ofSeconds(properties.getOtpSendCooldownSeconds())))) {
            Long remaining = redisTemplate.getExpire(cooldownKey);
            throw new TooManyRequestsException("Vui lòng chờ trước khi yêu cầu gửi lại OTP.",
                    remaining == null || remaining < 0
                            ? properties.getOtpSendCooldownSeconds() : remaining);
        }
    }

    public void checkPasswordResetOtpVerify(String email, String ip) {
        if (!properties.isEnabled()) return;
        consume("password-reset-verify:ip", ip,
                properties.getOtpVerifyMaxPerIp(), properties.getOtpVerifyWindowSeconds());
        consume("password-reset-verify:email", email,
                properties.getOtpVerifyMaxPerEmail(), properties.getOtpVerifyWindowSeconds());
    }

    private void consume(String bucket, String value, int limit, long windowSeconds) {
        // Tăng bộ đếm và đặt TTL trong cùng một lệnh Redis.
        Long retryAfter = redisTemplate.execute(CONSUME, List.of(key(bucket, value)),
                Integer.toString(limit), Long.toString(windowSeconds));
        if (retryAfter == null) throw new IllegalStateException("Không đọc được bộ đếm giới hạn request");
        if (retryAfter != 0) {
            throw new TooManyRequestsException("Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.", retryAfter);
        }
    }

    private String key(String bucket, String value) {
        // Không đưa email hoặc IP nguyên văn vào tên khóa Redis.
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(
                    value.strip().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8));
            return properties.getKeyPrefix() + bucket + ":" + HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 không khả dụng", ex);
        }
    }
}

package ute.phuc.quanngon.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import ute.phuc.quanngon.config.AuthRateLimitProperties;
import ute.phuc.quanngon.exception.TooManyRequestsException;
import ute.phuc.quanngon.service.AuthRateLimitService;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class AuthRateLimitServiceImpl implements AuthRateLimitService {

    private static final DefaultRedisScript<Long> CONSUME = new DefaultRedisScript<>("""
            local count = redis.call('INCR', KEYS[1])
            if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
            if count > tonumber(ARGV[1]) then return redis.call('TTL', KEYS[1]) end
            return 0
            """, Long.class);

    private final StringRedisTemplate redisTemplate;
    private final AuthRateLimitProperties properties;

    @Override
    public void checkLogin(String email, String ip) {
        if (!properties.isEnabled()) return;
        consume("login:ip", ip, properties.getLoginMaxPerIp(), properties.getLoginWindowSeconds());
        consume("login:email", email, properties.getLoginMaxPerEmail(), properties.getLoginWindowSeconds());
    }

    @Override
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

    @Override
    public void checkOtpVerify(String email, String ip) {
        if (!properties.isEnabled()) return;
        consume("otp-verify:ip", ip, properties.getOtpVerifyMaxPerIp(), properties.getOtpVerifyWindowSeconds());
        consume("otp-verify:email", email, properties.getOtpVerifyMaxPerEmail(), properties.getOtpVerifyWindowSeconds());
    }

    @Override
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

    @Override
    public void checkPasswordResetOtpVerify(String email, String ip) {
        if (!properties.isEnabled()) return;
        consume("password-reset-verify:ip", ip,
                properties.getOtpVerifyMaxPerIp(), properties.getOtpVerifyWindowSeconds());
        consume("password-reset-verify:email", email,
                properties.getOtpVerifyMaxPerEmail(), properties.getOtpVerifyWindowSeconds());
    }

    @Override
    public long getPasswordResetOtpResendAfterSeconds(String email, String ip) {
        if (!properties.isEnabled()) {
            return 0;
        }

        // Đọc thời gian chờ giữa hai lần gửi.
        long cooldownSeconds = getRemainingSeconds(key("password-reset-cooldown:email", email));

        // Đọc thời gian chờ nếu đã đạt giới hạn gửi theo email hoặc IP.
        long emailLimitSeconds = getRemainingLimitSeconds(
                "password-reset-send:email", email, properties.getOtpSendMaxPerEmail());
        long ipLimitSeconds = getRemainingLimitSeconds(
                "password-reset-send:ip", ip, properties.getOtpSendMaxPerIp());

        return Math.max(cooldownSeconds, Math.max(emailLimitSeconds, ipLimitSeconds));
    }

    private long getRemainingLimitSeconds(String bucket, String value, int limit) {
        String redisKey = key(bucket, value);
        String count = redisTemplate.opsForValue().get(redisKey);
        if (count == null || Long.parseLong(count) < limit) {
            return 0;
        }
        return getRemainingSeconds(redisKey);
    }

    private long getRemainingSeconds(String redisKey) {
        Long remainingSeconds = redisTemplate.getExpire(redisKey, TimeUnit.SECONDS);
        if (remainingSeconds == null || remainingSeconds < 0) {
            return 0;
        }
        return Math.max(1L, remainingSeconds);
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

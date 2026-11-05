package ute.phuc.quanngon.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Component
@ConfigurationProperties(prefix = "app.auth-rate-limit")
@Validated
@Getter
@Setter
public class AuthRateLimitProperties {

    private boolean enabled = true;
    @NotBlank
    private String keyPrefix = "quanngon:auth-limit:";
    @Min(1)
    private long loginWindowSeconds = 900;
    @Min(1)
    private int loginMaxPerEmail = 10;
    @Min(1)
    private int loginMaxPerIp = 30;
    @Min(1)
    private long otpSendWindowSeconds = 3600;
    @Min(1)
    private int otpSendMaxPerEmail = 5;
    @Min(1)
    private int otpSendMaxPerIp = 20;
    @Min(1)
    private long otpSendCooldownSeconds = 60;
    @Min(1)
    private long otpVerifyWindowSeconds = 300;
    @Min(1)
    private int otpVerifyMaxPerEmail = 5;
    @Min(1)
    private int otpVerifyMaxPerIp = 30;
}

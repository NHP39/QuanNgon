package ute.phuc.quanngon.config;

import lombok.Getter;
import lombok.Setter;
import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Component
@ConfigurationProperties(prefix = "otp")
@Getter
@Setter
@Validated
public class OtpProperties {
    @Min(1)
    private long expirationSeconds;
}

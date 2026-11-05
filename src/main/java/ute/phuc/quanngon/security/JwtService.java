package ute.phuc.quanngon.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import ute.phuc.quanngon.enums.Role;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    @Value("${app.jwt.secret.access}")
    private String accessSecret;

    @Value("${app.jwt.secret.refresh}")
    private String refreshSecret;

    @Value("${app.jwt.access-token-expiration-ms}")
    private long accessTokenExpirationsMs;

    @Value("${app.jwt.refresh-token-expiration-ms}")
    private long refreshTokenExpirationsMs;

    private SecretKey key(boolean isAccessToken) {
        String secret = isAccessToken ? accessSecret : refreshSecret;

        return Keys.hmacShaKeyFor(
                secret.getBytes(StandardCharsets.UTF_8)
        );
    }

    private String buildToken(Long userId, String email, Role role, long sessionVersion,
                              long expirationMs, boolean isAccessToken) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(email)
                .claim("uid", userId)
                .claim("role", role)
                .claim("sessionVersion", sessionVersion)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key(isAccessToken))
                .compact();
    }

    public String generateAccessToken(Long userId, String email, Role role, long sessionVersion) {
        return buildToken(userId, email, role, sessionVersion, accessTokenExpirationsMs, true);
    }

    public String generateRefreshToken(Long userId, String email, Role role, long sessionVersion) {
        return buildToken(userId, email, role, sessionVersion, refreshTokenExpirationsMs, false);
    }

    public Claims extractClaims(String token, boolean isAccessToken) {
        return Jwts.parser()
                .verifyWith(key(isAccessToken))
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String getTokenFromCookie(HttpServletRequest request, String cookieName) {
        Cookie[] cookies = request.getCookies();

        if (cookies != null) {
            for(Cookie cookie : cookies) {
                if (cookieName.equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }

        return null;
    }
}

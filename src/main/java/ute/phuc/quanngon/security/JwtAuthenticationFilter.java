package ute.phuc.quanngon.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.filter.OncePerRequestFilter;
import ute.phuc.quanngon.entity.Account;

import java.io.IOException;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String accessToken = jwtService.getTokenFromCookie(request, "access_token");
        if (accessToken == null || accessToken.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // Đọc và xác minh access token bằng khóa access.
            Claims claims = jwtService.extractClaims(accessToken, true);
            String email = claims.getSubject();
            Long tokenVersion = claims.get("sessionVersion", Long.class);

            if (email == null || email.isBlank() || tokenVersion == null || tokenVersion < 0) {
                throw new IllegalArgumentException(
                        "Access token chứa thông tin phiên không hợp lệ");
            }

            CustomUserDetails userDetails =
                    (CustomUserDetails) userDetailsService.loadUserByUsername(email);
            Account account = userDetails.getAccount();

            // Chỉ xác thực tài khoản còn hoạt động và đúng phiên hiện tại.
            if (!userDetails.isEnabled() || tokenVersion.longValue() != account.getSessionVersion()) {
                SecurityContextHolder.clearContext();
            } else {
                // Thiết lập xác thực cho request.
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );

                SecurityContextHolder.getContext()
                        .setAuthentication(authentication);
            }

        } catch (JwtException | IllegalArgumentException | UsernameNotFoundException ex) {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

}

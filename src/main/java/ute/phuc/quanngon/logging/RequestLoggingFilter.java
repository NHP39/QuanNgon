package ute.phuc.quanngon.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class RequestLoggingFilter extends OncePerRequestFilter {

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith(request.getContextPath() + "/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                   FilterChain filterChain) throws ServletException, IOException {
        // Logging: tự tạo mã request và trả qua header để đối chiếu với log BE.
        String requestId = UUID.randomUUID().toString();
        MDC.put("requestId", requestId);
        response.setHeader("X-Request-ID", requestId);
        long startedAt = System.nanoTime();
        boolean failed = false;

        try {
            filterChain.doFilter(request, response);
        } catch (ServletException | IOException | RuntimeException ex) {
            // Logging: ghi nguyên nhân lỗi ngoài controller.
            failed = true;
            log.error("Lỗi ngoài controller khi xử lý {} {}",
                    request.getMethod(), request.getRequestURI(), ex);
            throw ex;
        } finally {
            try {
                // Logging: chỉ ghi method, đường dẫn không có query, trạng thái và thời gian xử lý.
                long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);
                int status = failed ? HttpServletResponse.SC_INTERNAL_SERVER_ERROR : response.getStatus();
                if (status >= 500) {
                    log.warn("HTTP {} {} status={} durationMs={}",
                            request.getMethod(), request.getRequestURI(), status, durationMs);
                } else {
                    log.info("HTTP {} {} status={} durationMs={}",
                            request.getMethod(), request.getRequestURI(), status, durationMs);
                }
            } finally {
                // Logging: xóa mã khi kết thúc để không lẫn với request dùng lại cùng thread.
                MDC.remove("requestId");
            }
        }
    }
}

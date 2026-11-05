package ute.phuc.quanngon.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI quanNgonOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Quán Ngon API")
                        .version("1.0")
                        .description("""
                                API chia sẻ, tìm kiếm và đánh giá quán ăn.

                                Phân trang bắt đầu từ page=0. Đăng nhập qua POST /api/auth/login
                                trên Swagger để trình duyệt nhận cookie HttpOnly; các lần gọi tiếp theo
                                dùng cookie tự động. Không cần nhập JWT vào Authorize.
                                POST /api/auth/refresh cấp lại access token khi hết hạn.

                                API /api/admin/** chỉ dành cho ADMIN. API thành viên dành cho USER và ADMIN.
                                Đăng nhập, đăng ký, gửi và xác thực OTP có giới hạn request;
                                khi vượt giới hạn, API trả 429 và header Retry-After (số giây cần chờ).
                                """))
                .components(new Components().addSecuritySchemes("cookieAuth", new SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY)
                        .in(SecurityScheme.In.COOKIE)
                        .name("access_token")
                        .description("Cookie HttpOnly được thiết lập sau khi gọi API đăng nhập."))
                        .addSecuritySchemes("refreshCookie", new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.COOKIE)
                                .name("refresh_token")
                                .description("Cookie HttpOnly dành cho API cấp lại access token.")));
    }
}

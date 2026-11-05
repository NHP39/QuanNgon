package ute.phuc.quanngon.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.util.List;

import static org.mockito.Mockito.mock;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringJUnitConfig({SecurityConfig.class, SecurityConfigTest.TestConfig.class})
@WebAppConfiguration
@TestPropertySource(properties = {
        "app.jwt.secret.access=security-config-test-only-access-secret-value",
        "app.jwt.secret.refresh=security-config-test-only-refresh-secret-value",
        "app.jwt.access-token-expiration-ms=60000",
        "app.jwt.refresh-token-expiration-ms=60000"
})
class SecurityConfigTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void publicCatalogAllowsAnonymousRequests() throws Exception {
        mvc.perform(get("/api/eateries")).andExpect(status().isOk());
        mvc.perform(get("/api/categories")).andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"USER", "ADMIN"})
    void memberEndpointsAllowBothRoles(String role) throws Exception {
        for (MockHttpServletRequestBuilder request : memberRequests()) {
            mvc.perform(request.with(user("member").roles(role))).andExpect(status().isOk());
        }
    }

    @Test
    void memberEndpointsRejectAnonymousRequests() throws Exception {
        for (MockHttpServletRequestBuilder request : memberRequests()) {
            mvc.perform(request).andExpect(status().isUnauthorized());
        }
    }

    @Test
    void unsupportedRoleCannotAccessMemberEndpoints() throws Exception {
        for (MockHttpServletRequestBuilder request : memberRequests()) {
            mvc.perform(request.with(user("unsupported").roles("OTHER")))
                    .andExpect(status().isForbidden());
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"USER", "OTHER"})
    void nonAdminCannotReadOrModifyAdminEateries(String role) throws Exception {
        mvc.perform(get("/api/admin/eateries").with(user("member").roles(role)))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/admin/eateries/1/status").with(user("member").roles(role)))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymousCannotReadOrModifyAdminEateries() throws Exception {
        mvc.perform(get("/api/admin/eateries")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/admin/eateries/1/status")).andExpect(status().isUnauthorized());
    }

    @Test
    void adminCanReadAndModifyAdminEateries() throws Exception {
        mvc.perform(get("/api/admin/eateries").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/admin/eateries/1/status").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());
    }

    private List<MockHttpServletRequestBuilder> memberRequests() {
        return List.of(
                post("/api/eateries"),
                get("/api/users/me"),
                patch("/api/users/me"),
                get("/api/users/me/eateries"),
                put("/api/users/me/favorites/1"),
                post("/api/eateries/1/reviews"),
                post("/api/auth/change-password")
        );
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebMvc
    @EnableWebSecurity
    static class TestConfig {
        @Bean
        JwtService jwtService() {
            return mock(JwtService.class);
        }

        @Bean
        UserDetailsService userDetailsService() {
            return mock(UserDetailsService.class);
        }

        @Bean
        TestEndpoints testEndpoints() {
            return new TestEndpoints();
        }
    }

    // Isolate authorization from the database, uploads and unfinished API implementations.
    @RestController
    static class TestEndpoints {
        @RequestMapping({
                "/api/eateries", "/api/categories", "/api/users/me",
                "/api/users/me/eateries", "/api/users/me/favorites/1",
                "/api/eateries/1/reviews", "/api/auth/change-password",
                "/api/admin/eateries", "/api/admin/eateries/1/status"
        })
        String handle() {
            return "ok";
        }
    }
}

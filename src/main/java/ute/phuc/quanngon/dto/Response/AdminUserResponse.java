package ute.phuc.quanngon.dto.Response;

import java.time.Instant;

public record AdminUserResponse(
        Long id,
        String fullName,
        String email,
        boolean active,
        Instant createdAt
) {
}

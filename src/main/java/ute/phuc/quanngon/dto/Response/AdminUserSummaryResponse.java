package ute.phuc.quanngon.dto.Response;

public record AdminUserSummaryResponse(
        long total,
        long active,
        long locked
) {
}

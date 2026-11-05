package ute.phuc.quanngon.dto.Response;

import java.util.List;

public record AdminUserPageResponse<T> (
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        AdminUserSummaryResponse summary
) {
}

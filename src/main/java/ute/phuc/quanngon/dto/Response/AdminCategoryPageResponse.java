package ute.phuc.quanngon.dto.Response;

import java.util.List;

public record AdminCategoryPageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        AdminCategorySummaryResponse summary
) {
}

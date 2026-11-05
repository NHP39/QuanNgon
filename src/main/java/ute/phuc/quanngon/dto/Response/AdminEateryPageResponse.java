package ute.phuc.quanngon.dto.Response;

import ute.phuc.quanngon.enums.EateryStatus;

import java.util.List;
import java.util.Map;

public record AdminEateryPageResponse<T> (
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        Map<EateryStatus, Long> counts
) {
}

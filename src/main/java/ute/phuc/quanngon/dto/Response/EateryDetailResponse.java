package ute.phuc.quanngon.dto.Response;

import java.util.List;

public record EateryDetailResponse(
        Long id,
        String name,
        String phoneContact,
        String content,
        CategoryResponse category,
        AddressResponse address,
        List<ImageResponse> images,
        double averageRating,
        long reviewCount,
        CriteriaAveragesResponse criteriaAverages
) {
}

package ute.phuc.quanngon.dto.Response;

import java.time.LocalDateTime;
import java.util.List;

public record ReviewResponse(
        Long id,
        ReviewAuthorResponse author,
        LocalDateTime createdAt,
        int foodQuantity,
        int serviceQuantity,
        int space,
        int cleanliness,
        double averageRating,
        String content,
        List<ReviewImageResponse> images
) {
}

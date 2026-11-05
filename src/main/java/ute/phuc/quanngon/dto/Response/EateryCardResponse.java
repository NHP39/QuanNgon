package ute.phuc.quanngon.dto.Response;

public record EateryCardResponse(
        Long id,
        String name,
        String categoryName,
        AddressResponse address,
        String thumbnailUrl,
        Double averageRating,
        long reviewCount,
        boolean isFavorite
) {
}

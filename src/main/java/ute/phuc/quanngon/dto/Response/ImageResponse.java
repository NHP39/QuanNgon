package ute.phuc.quanngon.dto.Response;

import ute.phuc.quanngon.enums.ImageType;

public record ImageResponse(
        Long id,
        String imageUrl,
        ImageType type
) {
}
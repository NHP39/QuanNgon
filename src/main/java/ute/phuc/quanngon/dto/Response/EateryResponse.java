package ute.phuc.quanngon.dto.Response;

import ute.phuc.quanngon.enums.EateryStatus;

import java.util.List;

public record EateryResponse(
        Long id,
        String name,
        String phoneContact,
        String content,
        EateryStatus status,
        CategoryResponse category,
        AddressResponse address,
        List<ImageResponse> images
) {
}

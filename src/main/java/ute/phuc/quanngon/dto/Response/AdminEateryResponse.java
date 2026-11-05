package ute.phuc.quanngon.dto.Response;

import ute.phuc.quanngon.enums.EateryStatus;

import java.time.Instant;
import java.util.List;

public record AdminEateryResponse(
        Long id,
        String name,
        String phoneContact,
        String content,
        EateryStatus status,
        String rejectionReason,
        CategoryResponse category,
        AddressResponse address,
        List<ImageResponse> images,
        OwnerResponse owner,
        Long version,
        Instant createdAt
) {}

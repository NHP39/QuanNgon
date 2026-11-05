package ute.phuc.quanngon.dto.Response;

import ute.phuc.quanngon.enums.EateryStatus;

import java.util.Map;

public record EateryStatusStatisticsResponse(
        long totalEateries,
        Map<EateryStatus, Long> countsByStatus
) {}

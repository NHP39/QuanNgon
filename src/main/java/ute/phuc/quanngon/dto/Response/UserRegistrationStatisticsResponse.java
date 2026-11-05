package ute.phuc.quanngon.dto.Response;

import java.util.List;

public record UserRegistrationStatisticsResponse(
        long totalRegistrations,
        List<DailyRegistrationResponse> dailyRegistrations
) {}

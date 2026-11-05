package ute.phuc.quanngon.dto.Response;

import java.util.List;

public record PostStatisticsResponse(
        long totalPosts,
        List<DailyPostResponse> dailyPosts
) {}

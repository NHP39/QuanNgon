package ute.phuc.quanngon.dto.Response;

import java.time.LocalDate;

public record DailyPostResponse(
        LocalDate postDate,
        long postCount
) {}

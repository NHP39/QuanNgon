package ute.phuc.quanngon.dto.Response;

import java.time.LocalDate;

public record DailyRegistrationResponse(
        LocalDate registrationDate,
        long registrationCount
) {}

package ute.phuc.quanngon.repository;

import java.time.LocalDate;

public interface DailyRegistrationCount {
    LocalDate getRegistrationDate();
    Long getRegistrationCount();
}

package ute.phuc.quanngon.repository;

import java.time.LocalDate;

public interface DailyPostCount {
    LocalDate getPostDate();
    Long getPostCount();
}

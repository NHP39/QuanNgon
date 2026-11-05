package ute.phuc.quanngon.service.impl;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ute.phuc.quanngon.dto.Response.DailyPostResponse;
import ute.phuc.quanngon.dto.Response.DailyRegistrationResponse;
import ute.phuc.quanngon.dto.Response.EateryStatusStatisticsResponse;
import ute.phuc.quanngon.dto.Response.PostStatisticsResponse;
import ute.phuc.quanngon.dto.Response.UserRegistrationStatisticsResponse;
import ute.phuc.quanngon.enums.EateryStatus;
import ute.phuc.quanngon.repository.AccountRepository;
import ute.phuc.quanngon.repository.DailyPostCount;
import ute.phuc.quanngon.repository.DailyRegistrationCount;
import ute.phuc.quanngon.repository.EateryRepository;
import ute.phuc.quanngon.service.DashboardService;
import ute.phuc.quanngon.service.EateryService;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static ute.phuc.quanngon.config.RedisCacheConfig.*;

@Service
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private final AccountRepository accountRepository;
    private final EateryRepository eateryRepository;
    private final EateryService eateryService;
    private final ZoneId statisticsZone;

    public DashboardServiceImpl(
            AccountRepository accountRepository,
            EateryRepository eateryRepository,
            EateryService eateryService,
            @Value("${app.statistics.time-zone}") String statisticsTimeZone) {
        this.accountRepository = accountRepository;
        this.eateryRepository = eateryRepository;
        this.eateryService = eateryService;
        this.statisticsZone = ZoneId.of(statisticsTimeZone);
    }

    @Override
    @Cacheable(cacheNames = DASHBOARD_USERS, key = "#root.target.statisticsCacheKey(#p0)")
    public UserRegistrationStatisticsResponse getUserRegistrationStatistics(
            int days) {

        // Xác định khoảng thống kê theo múi giờ cấu hình, có tính hôm nay.
        LocalDate endDateExclusive = LocalDate.now(statisticsZone).plusDays(1);
        LocalDate startDate = endDateExclusive.minusDays(days);

        Instant startTime = startDate.atStartOfDay(statisticsZone).toInstant();
        Instant endTimeExclusive = endDateExclusive
                .atStartOfDay(statisticsZone).toInstant();

        // Lấy số đăng ký được DB gom nhóm theo cùng múi giờ.
        List<DailyRegistrationCount> dailyCounts =
                accountRepository.countRegistrationsByDate(
                        startTime, endTimeExclusive, statisticsZone.getId());

        Map<LocalDate, Long> registrationCountsByDate = new HashMap<>();
        for (DailyRegistrationCount dailyCount : dailyCounts) {
            registrationCountsByDate.put(
                    dailyCount.getRegistrationDate(),
                    dailyCount.getRegistrationCount());
        }

        // Bổ sung ngày không có đăng ký và sắp xếp ngày tăng dần.
        List<DailyRegistrationResponse> dailyRegistrations =
                startDate.datesUntil(endDateExclusive)
                        .map(date -> new DailyRegistrationResponse(
                                date,
                                registrationCountsByDate.getOrDefault(date, 0L)))
                        .toList();

        // Tính tổng số đăng ký trong khoảng và trả kết quả.
        long totalRegistrations = dailyRegistrations.stream()
                .mapToLong(DailyRegistrationResponse::registrationCount)
                .sum();

        return new UserRegistrationStatisticsResponse(
                totalRegistrations, dailyRegistrations);
    }

    @Override
    @Cacheable(cacheNames = DASHBOARD_EATERY_STATUSES, key = "'all'")
    public EateryStatusStatisticsResponse getEateryStatusStatistics() {
        // Dùng chung logic đếm trạng thái với màn quản lý bài đăng.
        Map<EateryStatus, Long> countsByStatus =
                eateryService.getEateryCountsByStatus();

        // Tính tổng từ cùng kết quả đếm, không gọi thêm query.
        long totalEateries = countsByStatus.values().stream()
                .mapToLong(Long::longValue)
                .sum();

        return new EateryStatusStatisticsResponse(totalEateries, countsByStatus);
    }

    @Override
    @Cacheable(cacheNames = DASHBOARD_POSTS, key = "#root.target.statisticsCacheKey(#p0)")
    public PostStatisticsResponse getPostStatistics(int days) {
        // Xác định khoảng thống kê theo múi giờ cấu hình, có tính hôm nay.
        LocalDate endDateExclusive = LocalDate.now(statisticsZone).plusDays(1);
        LocalDate startDate = endDateExclusive.minusDays(days);

        Instant startTime = startDate.atStartOfDay(statisticsZone).toInstant();
        Instant endTimeExclusive = endDateExclusive
                .atStartOfDay(statisticsZone).toInstant();

        // Lấy số bài đăng được DB gom nhóm theo cùng múi giờ.
        List<DailyPostCount> dailyCounts =
                eateryRepository.countPostsByDate(
                        startTime, endTimeExclusive, statisticsZone.getId());

        Map<LocalDate, Long> postCountsByDate = new HashMap<>();
        for (DailyPostCount dailyCount : dailyCounts) {
            postCountsByDate.put(dailyCount.getPostDate(), dailyCount.getPostCount());
        }

        // Bổ sung ngày không có bài đăng và sắp xếp ngày tăng dần.
        List<DailyPostResponse> dailyPosts =
                startDate.datesUntil(endDateExclusive)
                        .map(date -> new DailyPostResponse(
                                date, postCountsByDate.getOrDefault(date, 0L)))
                        .toList();

        // Tính tổng số bài đăng trong khoảng và trả kết quả.
        long totalPosts = dailyPosts.stream()
                .mapToLong(DailyPostResponse::postCount)
                .sum();

        return new PostStatisticsResponse(totalPosts, dailyPosts);
    }

    public String statisticsCacheKey(int days) {
        return statisticsZone.getId() + ":" + LocalDate.now(statisticsZone) + ":" + days;
    }
}

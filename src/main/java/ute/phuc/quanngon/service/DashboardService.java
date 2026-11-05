package ute.phuc.quanngon.service;

import ute.phuc.quanngon.dto.Response.EateryStatusStatisticsResponse;
import ute.phuc.quanngon.dto.Response.PostStatisticsResponse;
import ute.phuc.quanngon.dto.Response.UserRegistrationStatisticsResponse;

public interface DashboardService {
    UserRegistrationStatisticsResponse getUserRegistrationStatistics(int days);

    EateryStatusStatisticsResponse getEateryStatusStatistics();

    PostStatisticsResponse getPostStatistics(int days);
}

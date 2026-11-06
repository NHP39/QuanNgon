package ute.phuc.quanngon.service;

import ute.phuc.quanngon.dto.Response.EateryCardResponse;
import ute.phuc.quanngon.dto.Response.PageResponse;

public interface FeaturedEateryService {

    PageResponse<EateryCardResponse> getFeaturedEateries();
}

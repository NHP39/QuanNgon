package ute.phuc.quanngon.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ute.phuc.quanngon.dto.Response.AddressResponse;
import ute.phuc.quanngon.dto.Response.EateryCardResponse;
import ute.phuc.quanngon.dto.Response.PageResponse;
import ute.phuc.quanngon.enums.EateryStatus;
import ute.phuc.quanngon.repository.EateryCardProjection;
import ute.phuc.quanngon.repository.EateryRepository;
import ute.phuc.quanngon.service.FeaturedEateryService;

import static ute.phuc.quanngon.config.RedisCacheConfig.FEATURED_EATERIES;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FeaturedEateryServiceImpl implements FeaturedEateryService {

    private final EateryRepository eateryRepository;

    @Override
    @Cacheable(cacheNames = FEATURED_EATERIES, key = "'top3'")
    public PageResponse<EateryCardResponse> getFeaturedEateries() {
        // Lấy ba quán đã duyệt có đánh giá theo thứ tự hiện tại.
        Sort ordering = Sort.by(
                Sort.Order.desc("averageRating"),
                Sort.Order.desc("reviewCount"),
                Sort.Order.desc("id"));

        Page<EateryCardProjection> cardPage = eateryRepository.searchPublicEateryCards(
                EateryStatus.APPROVED, "", null, "", true,
                PageRequest.of(0, 3, ordering));

        // Cache dữ liệu chung với trạng thái tim mặc định false.
        Page<EateryCardResponse> responsePage = cardPage.map(row -> new EateryCardResponse(
                row.getId(),
                row.getName(),
                row.getCategoryName(),
                new AddressResponse(row.getStreet(), row.getWard(), row.getProvince()),
                row.getThumbnailUrl(),
                row.getAverageRating(),
                row.getReviewCount(),
                false));

        return new PageResponse<>(
                responsePage.getContent(),
                responsePage.getNumber(),
                responsePage.getSize(),
                responsePage.getTotalElements(),
                responsePage.getTotalPages());
    }
}

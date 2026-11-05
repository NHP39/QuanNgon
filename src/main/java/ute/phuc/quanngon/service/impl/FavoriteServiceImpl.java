package ute.phuc.quanngon.service.impl;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import ute.phuc.quanngon.dto.Response.AddressResponse;
import ute.phuc.quanngon.dto.Response.EateryCardResponse;
import ute.phuc.quanngon.dto.Response.PageResponse;
import ute.phuc.quanngon.entity.User;
import ute.phuc.quanngon.exception.ResourceNotFoundException;
import ute.phuc.quanngon.repository.EateryCardProjection;
import ute.phuc.quanngon.repository.FavoriteRepository;
import ute.phuc.quanngon.repository.UserRepository;
import ute.phuc.quanngon.service.FavoriteService;

@Service
@RequiredArgsConstructor
public class FavoriteServiceImpl implements FavoriteService {
    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public void addFavorite(Long eateryId, String email) {
        // Tìm người dùng đang đăng nhập.
        User user = findCurrentUser(email);

        // Thêm yêu thích và bỏ qua bản ghi trùng.
        int insertedRows = favoriteRepository.insertIfAbsent(user.getId(), eateryId);

        if (insertedRows == 0 && !favoriteRepository.hasApprovedFavorite(user.getId(), eateryId)) {
            throw new ResourceNotFoundException("Không tìm thấy quán ăn hoặc quán chưa được duyệt.");
        }
    }

    @Override
    @Transactional
    public void removeFavorite(Long eateryId, String email) {
        // Tìm người dùng đang đăng nhập.
        User user = findCurrentUser(email);

        // Bỏ yêu thích kể cả khi quán đã ẩn hoặc bản ghi không còn tồn tại.
        favoriteRepository.deleteFavorite(user.getId(), eateryId);
    }

    @Override
    public PageResponse<EateryCardResponse> getMyFavorites(String email, int page, int size) {
        // Lấy các quán đã duyệt, sắp xếp theo lần thêm yêu thích gần nhất.
        Page<EateryCardProjection> favoritePage = favoriteRepository.findFavoriteCards(
                email, PageRequest.of(page, size));

        // Chuyển dữ liệu thành card dùng chung với Trang chủ và Khám phá.
        Page<EateryCardResponse> responsePage = favoritePage.map(row -> new EateryCardResponse(
                row.getId(), row.getName(), row.getCategoryName(),
                new AddressResponse(row.getStreet(), row.getWard(), row.getProvince()),
                row.getThumbnailUrl(), row.getAverageRating(), row.getReviewCount(), true));

        return new PageResponse<>(responsePage.getContent(), responsePage.getNumber(),
                responsePage.getSize(), responsePage.getTotalElements(), responsePage.getTotalPages());
    }

    private User findCurrentUser(String email) {
        return userRepository.findByAccountEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
    }
}

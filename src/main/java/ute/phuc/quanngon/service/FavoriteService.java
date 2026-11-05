package ute.phuc.quanngon.service;

import ute.phuc.quanngon.dto.Response.EateryCardResponse;
import ute.phuc.quanngon.dto.Response.PageResponse;

public interface FavoriteService {
    void addFavorite(Long eateryId, String email);

    void removeFavorite(Long eateryId, String email);

    PageResponse<EateryCardResponse> getMyFavorites(String email, int page, int size);
}

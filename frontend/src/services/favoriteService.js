import { apiRequest } from "./apiClient";
import { parseEateryCardPage } from "./eateryService";

export const FAVORITES_PAGE_SIZE = 6;

export async function getMyFavorites({ page = 0, signal } = {}) {
    const data = await apiRequest(`/users/me/favorites?page=${page}&size=${FAVORITES_PAGE_SIZE}`, { signal });
    const result = parseEateryCardPage(data, { page, size: FAVORITES_PAGE_SIZE });
    if (result.content.some((item) => !item.isFavorite)) {
        throw new Error("Dữ liệu quán yêu thích trả về không hợp lệ.");
    }
    return result;
}

export async function setEateryFavorite(eateryId, isFavorite) {
    if (!Number.isSafeInteger(eateryId) || eateryId <= 0 || typeof isFavorite !== "boolean") {
        throw new Error("Thông tin yêu thích không hợp lệ.");
    }
    const result = await apiRequest(`/users/me/favorites/${eateryId}`, {
        method: isFavorite ? "PUT" : "DELETE", includeStatus: true
    });
    if (result.status !== 204) throw new Error("Chưa xác nhận được thay đổi. Vui lòng tải lại danh sách.");
}

import { apiRequest } from "./apiClient";

function toReview(data) {
    if (!data || !Number.isSafeInteger(data.id) || data.id <= 0
        || !data.author || !Number.isSafeInteger(data.author.userId) || data.author.userId <= 0
        || typeof data.author.fullName !== "string" || !data.author.fullName.trim()
        || typeof data.createdAt !== "string" || Number.isNaN(Date.parse(data.createdAt))
        || typeof data.content !== "string"
        || ["foodQuantity", "serviceQuantity", "space", "cleanliness"].some((key) => !Number.isInteger(data[key]) || data[key] < 1 || data[key] > 5)
        || !Number.isFinite(data.averageRating) || data.averageRating < 1 || data.averageRating > 5
        || !Array.isArray(data.images) || data.images.some((image) => !image || !Number.isSafeInteger(image.id) || image.id <= 0
            || typeof image.imageUrl !== "string" || !image.imageUrl.trim())
        || new Set(data.images.map((image) => image.id)).size !== data.images.length) {
        throw new Error("Dữ liệu đánh giá trả về không hợp lệ.");
    }
    return data;
}

export async function getCurrentUserReview(eateryId, { signal } = {}) {
    const { status, data } = await apiRequest(`/eateries/${eateryId}/reviews/me`, { signal, includeStatus: true });
    if (status === 204) return null;
    if (status !== 200) throw new Error("Không xác định được đánh giá của bạn.");
    return toReview(data);
}

export async function createReview(eateryId, request, images = []) {
    const body = new FormData();
    body.append("data", new Blob([JSON.stringify(request)], { type: "application/json" }));
    images.forEach((image) => body.append("images", image, image.name));
    const { status, data } = await apiRequest(`/eateries/${eateryId}/reviews`, {
        method: "POST", body, includeStatus: true
    });
    if (status !== 201) throw new Error("Chưa xác nhận được kết quả gửi. Vui lòng kiểm tra đánh giá của bạn trước khi gửi lại.");
    return toReview(data);
}

export async function updateCurrentUserReview(eateryId, request, images = []) {
    const body = new FormData();
    body.append("data", new Blob([JSON.stringify(request)], { type: "application/json" }));
    images.forEach((image) => body.append("images", image, image.name));
    const { status, data } = await apiRequest(`/eateries/${eateryId}/reviews/me`, {
        method: "PATCH", body, includeStatus: true
    });
    if (status !== 200) throw new Error("Chưa xác nhận được kết quả lưu. Vui lòng kiểm tra đánh giá của bạn trước khi lưu lại.");
    return toReview(data);
}

export async function deleteCurrentUserReview(eateryId) {
    const { status } = await apiRequest(`/eateries/${eateryId}/reviews/me`, {
        method: "DELETE", includeStatus: true
    });
    if (status !== 204) throw new Error("Chưa xác nhận được kết quả xóa. Vui lòng tải lại đánh giá của bạn để kiểm tra.");
}

export async function getPublicEateryReviews(eateryId, { sort = "newest", page = 0, size = 5, signal } = {}) {
    const params = new URLSearchParams({ sort, page: String(page), size: String(size) });
    const data = await apiRequest(`/eateries/${eateryId}/reviews?${params}`, { signal });
    if (!data || !Array.isArray(data.content) || data.page !== page || data.size !== size
        || !Number.isSafeInteger(data.totalElements) || data.totalElements < 0
        || data.totalPages !== Math.ceil(data.totalElements / size)
        || data.content.length !== Math.min(size, Math.max(0, data.totalElements - page * size))
        || new Set(data.content.map((review) => review?.id)).size !== data.content.length) {
        throw new Error("Dữ liệu danh sách đánh giá trả về không hợp lệ.");
    }
    return { ...data, content: data.content.map(toReview) };
}

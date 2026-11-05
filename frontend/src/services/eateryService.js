import { apiRequest } from "./apiClient";

export async function getPublicEateryDetail(eateryId, { signal } = {}) {
    if (!Number.isSafeInteger(eateryId) || eateryId <= 0) {
        const error = new Error("Không tìm thấy quán ăn.");
        error.status = 404;
        throw error;
    }
    const data = await apiRequest(`/eateries/${eateryId}`, { signal });
    const validScore = (value) => Number.isFinite(value) && value >= 0 && value <= 5;
    if (!data || data.id !== eateryId || typeof data.name !== "string" || !data.name.trim()
        || typeof data.content !== "string" || typeof data.phoneContact !== "string"
        || !data.category || !Number.isSafeInteger(data.category.id) || data.category.id <= 0
        || typeof data.category.name !== "string" || !data.category.name.trim()
        || !data.address || ["street", "ward", "province"].some((key) => typeof data.address[key] !== "string")
        || !validScore(data.averageRating) || !Number.isSafeInteger(data.reviewCount) || data.reviewCount < 0
        || !data.criteriaAverages || ["foodQuantity", "serviceQuantity", "space", "cleanliness"].some((key) => !validScore(data.criteriaAverages[key]))
        || !Array.isArray(data.images)
        || data.images.some((image) => !image || !Number.isSafeInteger(image.id) || image.id <= 0
            || typeof image.imageUrl !== "string" || !image.imageUrl.trim() || !["THUMBNAIL", "GALLERY"].includes(image.type))
        || new Set(data.images.map((image) => image.id)).size !== data.images.length) {
        throw new Error("Dữ liệu chi tiết quán ăn trả về không hợp lệ.");
    }
    return data;
}

export async function getPublicEateries({ q = "", categoryId = "", province = "", sort = "newest", page = 0, size = 8, signal } = {}) {
    const params = new URLSearchParams({ sort, page: String(page), size: String(size) });
    if (q) params.set("q", q);
    if (categoryId) params.set("categoryId", String(categoryId));
    if (province) params.set("province", province);
    const data = await apiRequest(`/eateries?${params}`, { signal });
    return parseEateryCardPage(data, { page, size, onlyWithReviews: sort === "highestRated" });
}

export function parseEateryCardPage(data, { page, size, onlyWithReviews = false }) {
    const invalid = () => new Error("Dữ liệu quán ăn trả về không hợp lệ.");
    if (!data || !Array.isArray(data.content) || data.page !== page || data.size !== size
        || !Number.isSafeInteger(data.totalElements) || data.totalElements < 0
        || data.totalPages !== Math.ceil(data.totalElements / size)
        || data.content.length !== Math.min(size, Math.max(0, data.totalElements - page * size))) throw invalid();

    const ids = new Set();
    const content = data.content.map((item) => {
        if (!item || !Number.isSafeInteger(item.id) || item.id <= 0 || ids.has(item.id)
            || typeof item.name !== "string" || !item.name.trim()
            || typeof item.categoryName !== "string" || !item.categoryName.trim()
            || !item.address || ["street", "ward", "province"].some((key) => typeof item.address[key] !== "string")
            || (item.thumbnailUrl !== null && typeof item.thumbnailUrl !== "string")
            || !Number.isFinite(item.averageRating) || item.averageRating < 0 || item.averageRating > 5
            || !Number.isSafeInteger(item.reviewCount) || item.reviewCount < 0
            || typeof item.isFavorite !== "boolean"
            || (onlyWithReviews && (item.reviewCount < 1 || item.averageRating < 1))) throw invalid();
        ids.add(item.id);
        return {
            id: item.id,
            name: item.name,
            category: item.categoryName,
            image: item.thumbnailUrl,
            rating: item.averageRating,
            reviewCount: item.reviewCount,
            location: item.address.ward.trim(),
            province: item.address.province.trim(),
            isFavorite: item.isFavorite
        };
    });
    return { ...data, content };
}

export async function getTopRatedEateries({ signal } = {}) {
    const data = await getPublicEateries({ sort: "highestRated", page: 0, size: 3, signal });
    return data.content;
}

export async function getCategories({ signal } = {}) {
    const data = await apiRequest("/categories", { signal });
    if (!Array.isArray(data) || data.some((item) => !item || !Number.isSafeInteger(item.id) || item.id <= 0
        || typeof item.name !== "string" || !item.name.trim())
        || new Set(data.map((item) => item.id)).size !== data.length) throw new Error("Dữ liệu danh mục không hợp lệ.");
    return data;
}

export async function getPublicEateryProvinces({ signal } = {}) {
    const data = await apiRequest("/eateries/provinces", { signal });
    if (!Array.isArray(data) || data.some((item) => typeof item !== "string" || !item.trim())
        || new Set(data).size !== data.length) throw new Error("Dữ liệu tỉnh/thành không hợp lệ.");
    return data;
}

export async function createEatery(data, thumbnail, gallery) {
    const body = new FormData();
    body.append("data", new Blob([JSON.stringify(data)], { type: "application/json" }));
    body.append("thumbnail", thumbnail);
    gallery.forEach((file) => body.append("gallery", file));

    return apiRequest("/eateries", { method: "POST", body });
}

import { apiRequest } from "./apiClient";
import { EATERY_STATUS_LABELS } from "../data/eateryStatus";

function toMyEatery(item) {
    if (!item || !Number.isSafeInteger(item.id) || item.id <= 0
        || typeof item.name !== "string" || !item.name.trim()
        || !Object.hasOwn(EATERY_STATUS_LABELS, item.status)
        || typeof item.content !== "string" || typeof item.phoneContact !== "string"
        || !item.category || !Number.isSafeInteger(item.category.id) || item.category.id <= 0
        || typeof item.category.name !== "string" || !item.category.name.trim()
        || !item.address || ["street", "ward", "province"].some((key) => typeof item.address[key] !== "string")
        || !Number.isSafeInteger(item.version) || item.version < 0
        || [item.createdAt, item.updatedAt].some((date) => typeof date !== "string" || Number.isNaN(Date.parse(date)))
        || (item.rejectionReason !== null && typeof item.rejectionReason !== "string")
        || !Array.isArray(item.images)
        || item.images.some((image) => !image || !Number.isSafeInteger(image.id) || image.id <= 0
            || typeof image.imageUrl !== "string" || !image.imageUrl.trim()
            || !["THUMBNAIL", "GALLERY"].includes(image.type))
        || new Set(item.images.map((image) => image.id)).size !== item.images.length) {
        throw new Error("Dữ liệu quán đã chia sẻ trả về không hợp lệ.");
    }
    return {
        ...item,
        categoryId: item.category.id,
        category: item.category.name,
        street: item.address.street,
        ward: item.address.ward,
        province: item.address.province,
        thumbnailUrl: item.images.find((image) => image.type === "THUMBNAIL")?.imageUrl || "",
        galleryUrls: item.images.filter((image) => image.type === "GALLERY").map((image) => image.imageUrl)
    };
}

export async function getMyEateries({ status = "ALL", page = 0, size = 10, signal } = {}) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status !== "ALL") params.set("status", status);
    const data = await apiRequest(`/users/me/eateries?${params}`, { signal });
    if (!data || !Array.isArray(data.content) || data.page !== page || data.size !== size
        || !Number.isSafeInteger(data.totalElements) || data.totalElements < 0
        || data.totalPages !== Math.ceil(data.totalElements / size)
        || data.content.length !== Math.min(size, Math.max(0, data.totalElements - page * size))
        || new Set(data.content.map((item) => item?.id)).size !== data.content.length) {
        throw new Error("Dữ liệu danh sách quán đã chia sẻ trả về không hợp lệ.");
    }
    const content = data.content.map(toMyEatery);
    if (status !== "ALL" && content.some((eatery) => eatery.status !== status)) {
        throw new Error("Dữ liệu trạng thái quán đã chia sẻ trả về không hợp lệ.");
    }
    return { ...data, content };
}

function requireEateryId(eateryId) {
    if (!Number.isSafeInteger(eateryId) || eateryId <= 0) {
        const error = new Error("Không tìm thấy quán ăn.");
        error.status = 404;
        throw error;
    }
}

export async function getMyEateryDetail(eateryId, { signal } = {}) {
    requireEateryId(eateryId);
    const data = await apiRequest(`/users/me/eateries/${eateryId}`, { signal });
    const eatery = toMyEatery(data);
    if (eatery.id !== eateryId) throw new Error("Dữ liệu chi tiết quán trả về không hợp lệ.");
    return eatery;
}

export async function updateMyEatery(eateryId, data, thumbnail, gallery) {
    requireEateryId(eateryId);
    const body = new FormData();
    body.append("data", new Blob([JSON.stringify(data)], { type: "application/json" }));
    if (thumbnail) body.append("thumbnail", thumbnail);
    gallery.forEach((file) => body.append("gallery", file));
    const eatery = toMyEatery(await apiRequest(`/users/me/eateries/${eateryId}`, { method: "PATCH", body }));
    if (eatery.id !== eateryId || eatery.status !== "PENDING" || eatery.version <= data.version) {
        throw new Error("Chưa xác nhận được kết quả chỉnh sửa. Vui lòng tải lại thông tin quán.");
    }
    return eatery;
}

export async function updateMyEateryVisibility(eateryId, { hidden, version }) {
    requireEateryId(eateryId);
    const eatery = toMyEatery(await apiRequest(`/users/me/eateries/${eateryId}/visibility`, {
        method: "PATCH", json: { hidden, version }
    }));
    if (eatery.id !== eateryId || eatery.status !== (hidden ? "HIDDEN" : "APPROVED") || eatery.version <= version) {
        throw new Error("Chưa xác nhận được trạng thái quán. Vui lòng tải lại danh sách.");
    }
    return eatery;
}

export async function deleteMyEatery(eateryId) {
    requireEateryId(eateryId);
    const result = await apiRequest(`/users/me/eateries/${eateryId}`, { method: "DELETE", includeStatus: true });
    if (result.status !== 204) throw new Error("Chưa xác nhận được kết quả xóa. Vui lòng tải lại danh sách.");
}

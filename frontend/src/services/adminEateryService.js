import { apiRequest } from "./apiClient";

const ADMIN_EATERY_STATUSES = ["PENDING", "APPROVED", "REJECTED", "HIDDEN"];

function toAdminEatery(item) {
    if (!item || !Number.isSafeInteger(item.id) || item.id <= 0
        || typeof item.name !== "string" || !ADMIN_EATERY_STATUSES.includes(item.status)
        || !Number.isSafeInteger(item.version) || item.version < 0
        || !Array.isArray(item.images)) {
        throw new Error("Dữ liệu quán ăn trả về không hợp lệ.");
    }
    const images = item.images.filter((image) => typeof image?.imageUrl === "string" && image.imageUrl);
    return {
        ...item,
        content: item.content || "",
        category: item.category?.name || "Chưa phân loại",
        street: item.address?.street || "",
        ward: item.address?.ward || "",
        province: item.address?.province || "",
        thumbnailUrl: images.find((image) => image.type === "THUMBNAIL")?.imageUrl || "",
        galleryUrls: images.filter((image) => image.type === "GALLERY").map((image) => image.imageUrl),
        owner: { fullName: item.owner?.fullName || "Chưa có thông tin", email: item.owner?.email || "" },
        createdAt: item.createdAt && !Number.isNaN(Date.parse(item.createdAt)) ? item.createdAt : null
    };
}

export async function getAdminEateries({ status, q = "", page = 0, size = 10, signal }) {
    const params = new URLSearchParams({ status, page: String(page), size: String(size) });
    if (q.trim()) params.set("q", q.trim());
    const data = await apiRequest(`/admin/eateries?${params}`, { signal });
    if (!data || !Array.isArray(data.content)
        || !Number.isSafeInteger(data.page) || data.page < 0
        || !Number.isSafeInteger(data.size) || data.size < 1
        || !Number.isSafeInteger(data.totalElements) || data.totalElements < 0
        || !Number.isSafeInteger(data.totalPages) || data.totalPages < 0
        || !data.counts || ADMIN_EATERY_STATUSES.some((status) => !Number.isSafeInteger(data.counts[status]) || data.counts[status] < 0)) {
        throw new Error("Dữ liệu danh sách quán ăn trả về không hợp lệ.");
    }
    return { ...data, content: data.content.map(toAdminEatery) };
}

export async function updateAdminEateryStatus(eateryId, { status, reason, version }) {
    const json = { status, version };
    if (status === "REJECTED") json.reason = reason.trim();
    const data = await apiRequest(`/admin/eateries/${eateryId}/status`, { method: "PATCH", json });
    return toAdminEatery(data);
}

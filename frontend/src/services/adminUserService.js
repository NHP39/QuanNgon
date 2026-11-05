import { apiRequest } from "./apiClient";

function toAdminUser(item) {
    if (!item || !Number.isSafeInteger(item.id) || item.id <= 0
        || typeof item.fullName !== "string" || typeof item.email !== "string"
        || typeof item.active !== "boolean" || typeof item.createdAt !== "string"
        || Number.isNaN(Date.parse(item.createdAt))) {
        throw new Error("Dữ liệu người dùng trả về không hợp lệ.");
    }
    return {
        id: item.id,
        fullName: item.fullName,
        email: item.email,
        active: item.active,
        createdAt: item.createdAt
    };
}

export async function getAdminUsers({ q = "", status = "all", sort = "newest", page = 0, size = 8, signal }) {
    const params = new URLSearchParams({ page: String(page), size: String(size), sortDir: sort === "oldest" ? "asc" : "desc" });
    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("active", String(status === "active"));
    const data = await apiRequest(`/admin/users?${params}`, { signal });
    if (!data || !Array.isArray(data.content)
        || !Number.isSafeInteger(data.page) || data.page < 0
        || !Number.isSafeInteger(data.size) || data.size < 1
        || !Number.isSafeInteger(data.totalElements) || data.totalElements < 0
        || !Number.isSafeInteger(data.totalPages) || data.totalPages < 0
        || !data.summary || ["total", "active", "locked"].some((key) => !Number.isSafeInteger(data.summary[key]) || data.summary[key] < 0)) {
        throw new Error("Dữ liệu danh sách người dùng trả về không hợp lệ.");
    }
    return { ...data, content: data.content.map(toAdminUser) };
}

export async function updateAdminUserStatus(userId, active) {
    if (!Number.isSafeInteger(userId) || userId <= 0 || typeof active !== "boolean") {
        throw new Error("Thông tin cập nhật tài khoản không hợp lệ.");
    }
    const data = await apiRequest(`/admin/users/${userId}/status`, { method: "PATCH", json: { active } });
    return toAdminUser(data);
}

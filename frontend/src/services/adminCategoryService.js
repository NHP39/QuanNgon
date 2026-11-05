import { apiRequest } from "./apiClient";

function toAdminCategory(item) {
    if (!item || !Number.isSafeInteger(item.id) || item.id <= 0
        || typeof item.name !== "string" || !item.name.trim()
        || !Number.isSafeInteger(item.eateryCount) || item.eateryCount < 0) {
        throw new Error("Dữ liệu danh mục trả về không hợp lệ.");
    }
    return { id: item.id, name: item.name, eateryCount: item.eateryCount };
}

function checkCategoryId(id) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("ID danh mục không hợp lệ.");
}

export async function getAdminCategories({ q = "", page = 0, size = 7, signal }) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (q.trim()) params.set("q", q.trim());
    const data = await apiRequest(`/admin/categories?${params}`, { signal });
    if (!data || !Array.isArray(data.content)
        || !Number.isSafeInteger(data.page) || data.page < 0
        || !Number.isSafeInteger(data.size) || data.size < 1
        || !Number.isSafeInteger(data.totalElements) || data.totalElements < 0
        || !Number.isSafeInteger(data.totalPages) || data.totalPages < 0
        || !data.summary || ["total", "eateryCount"].some((key) => !Number.isSafeInteger(data.summary[key]) || data.summary[key] < 0)) {
        throw new Error("Dữ liệu danh sách danh mục trả về không hợp lệ.");
    }
    return { ...data, content: data.content.map(toAdminCategory) };
}

export async function createAdminCategory(name) {
    return toAdminCategory(await apiRequest("/admin/categories", { method: "POST", json: { name } }));
}

export async function updateAdminCategory(id, name) {
    checkCategoryId(id);
    return toAdminCategory(await apiRequest(`/admin/categories/${id}`, { method: "PATCH", json: { name } }));
}

export async function deleteAdminCategory(id) {
    checkCategoryId(id);
    await apiRequest(`/admin/categories/${id}`, { method: "DELETE" });
}

import { apiRequest } from "./apiClient";

export async function updateUserInfo(fullName) {
    const data = await apiRequest("/users/me", { method: "PATCH", json: { fullName } });
    if (!data || typeof data.fullName !== "string" || !data.fullName.trim()
        || typeof data.email !== "string" || !data.email.trim()
        || !["USER", "ADMIN"].includes(data.role)) {
        throw new Error("Chưa xác nhận được kết quả cập nhật thông tin tài khoản.");
    }
    return { fullName: data.fullName, email: data.email, role: data.role };
}

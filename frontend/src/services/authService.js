import { apiRequest, refreshAccessToken } from "./apiClient";

const authRequest = (path, method, json) => apiRequest(`/auth${path}`, { method, json });

export const login = (email, password) =>
    authRequest("/login", "POST", { email, password });

export const register = (form) =>
    authRequest("/register", "POST", form);

export const verifyOtp = (email, otp) =>
    authRequest("/verify-otp", "POST", { email, otp });

export const resendOtp = (email) =>
    authRequest("/resend-otp", "POST", { email });

export async function forgotPassword(email) {
    const data = await authRequest("/forgot-password", "POST", { email });
    if (!data || typeof data.email !== "string" || !Number.isFinite(data.expiresIn) || data.expiresIn <= 0) {
        throw new Error("Chưa xác nhận được yêu cầu gửi mã. Vui lòng thử lại sau.");
    }
    return data;
}

export async function resetPassword(form) {
    const data = await authRequest("/reset-password", "POST", form);
    if (!data || typeof data.message !== "string" || !data.message.trim()) {
        throw new Error("Chưa xác nhận được kết quả đặt lại mật khẩu. Vui lòng đăng nhập để kiểm tra.");
    }
    return data;
}

export const refresh = () =>
    refreshAccessToken();

export const getMe = () =>
    authRequest("/me", "GET");

export const logout = () =>
    authRequest("/logout", "POST");

export async function changePassword(form) {
    const data = await authRequest("/change-password", "POST", form);
    if (!data || typeof data.message !== "string" || !data.message.trim()) {
        throw new Error("Chưa xác nhận được kết quả đổi mật khẩu. Vui lòng đăng nhập lại để kiểm tra.");
    }
    return data;
}

export async function loadCurrentUser() {
    return getMe();
}

const emailKey = "passwordResetEmail";
const expiryKey = "passwordResetExpiresAt";
const resendKey = "passwordResetResendAt";

export function readPasswordRecovery() {
    try {
        return {
            email: sessionStorage.getItem(emailKey) || "",
            expiresAt: Number(sessionStorage.getItem(expiryKey)) || 0,
            resendAt: Number(sessionStorage.getItem(resendKey)) || 0
        };
    } catch {
        return { email: "", expiresAt: 0, resendAt: 0 };
    }
}

export function savePasswordRecovery(email, expiresIn) {
    const state = { email, expiresAt: Date.now() + expiresIn * 1000, resendAt: Date.now() + 60000 };
    try {
        sessionStorage.setItem(emailKey, email);
        sessionStorage.setItem(expiryKey, String(state.expiresAt));
        sessionStorage.setItem(resendKey, String(state.resendAt));
    } catch { /* Form vẫn cho nhập email nếu trình duyệt không cho lưu trạng thái. */ }
    return state;
}

export function finishPasswordRecovery(email, message) {
    try {
        sessionStorage.removeItem(emailKey);
        sessionStorage.removeItem(expiryKey);
        sessionStorage.removeItem(resendKey);
        sessionStorage.setItem("authPrefillEmail", email);
        sessionStorage.setItem("authNotice", message);
    } catch { /* Vẫn chuyển về đăng nhập khi không lưu được thông báo. */ }
}

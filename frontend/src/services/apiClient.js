import { API_BASE_URL } from "../config";

const LOGIN_REQUIRED_MESSAGE = "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.";
let refreshPromise = null;
let accessTokenVersion = 0;
// Bộ đếm request trong tab; phiên JWT do BE kiểm tra với DB.
let sessionGeneration = 0;
let lastRefreshFailure = null;

export function isConnectionError(error) {
    return error?.connectionError === true || error?.status >= 500;
}

export function getApiErrorMessage(error, fallback = "") {
    return isConnectionError(error)
        ? fallback || "Chưa thể hoàn tất thao tác. Vui lòng thử lại."
        : error?.message || fallback;
}

async function requestOnce(path, { method = "GET", json, body, signal, includeStatus = false } = {}) {
    const timeoutSignal = AbortSignal.timeout(30000);
    const options = { method, credentials: "include", signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal };
    if (json !== undefined) {
        options.headers = { "Content-Type": "application/json" };
        options.body = JSON.stringify(json);
    } else if (body !== undefined) {
        options.body = body;
    }

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, options);
    } catch (cause) {
        if (signal?.aborted) throw cause;
        const error = new Error(cause.name === "TimeoutError" ? "Máy chủ phản hồi quá lâu. Vui lòng thử lại." : "Không kết nối được máy chủ. Vui lòng thử lại.", { cause });
        error.connectionError = true;
        throw error;
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const validationErrors = data?.validationErrors ?? data?.errors;
        const fieldError = validationErrors && typeof validationErrors === "object" && Object.values(validationErrors)[0];
        const detail = Array.isArray(fieldError) ? fieldError[0] : fieldError;
        const fallback = response.status === 401 ? LOGIN_REQUIRED_MESSAGE
            : response.status === 403 ? "Bạn không có quyền thực hiện thao tác này."
                : `Yêu cầu thất bại (${response.status}).`;
        const error = new Error(detail || data?.message || fallback);
        error.status = response.status;
        error.code = data?.error;
        error.validationErrors = validationErrors;
        const retryAfter = Number(response.headers.get("Retry-After"));
        error.retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null;
        throw error;
    }
    return includeStatus ? { status: response.status, data } : data;
}

function sessionChanged() {
    const error = new Error("Phiên đăng nhập đã thay đổi. Vui lòng tải lại thông tin trước khi thao tác.");
    error.status = 401;
    error.sessionChanged = true;
    return error;
}

export function refreshAccessToken() {
    if (refreshPromise) return refreshPromise;
    const currentSession = sessionGeneration;
    const currentAccessToken = accessTokenVersion;

    // Các request trong cùng tab chờ chung một lần refresh.
    refreshPromise = requestOnce("/auth/refresh", { method: "POST" }).then((data) => {
        if (sessionGeneration !== currentSession) throw sessionChanged();
        accessTokenVersion += 1;
        lastRefreshFailure = null;
        return data;
    }).catch((error) => {
        if (error.status === 401 && !error.sessionChanged) {
            const failure = new Error(LOGIN_REQUIRED_MESSAGE, { cause: error });
            failure.status = 401;
            error = failure;
        }
        if (sessionGeneration === currentSession && [401, 403].includes(error.status)) {
            lastRefreshFailure = { session: currentSession, token: currentAccessToken, error };
        }
        throw error;
    }).finally(() => { refreshPromise = null; });

    return refreshPromise;
}

export async function apiRequest(path, options = {}) {
    const pathname = path.split("?")[0];
    const currentSession = sessionGeneration;
    const currentAccessToken = accessTokenVersion;
    const canRefresh = !pathname.startsWith("/auth/")
        || pathname === "/auth/me" || pathname === "/auth/change-password";
    let result;

    try {
        result = await requestOnce(path, options);
    } catch (error) {
        if (options.signal?.aborted) throw options.signal.reason;
        if (error.status !== 401 || !canRefresh) throw error;
        if (sessionGeneration !== currentSession) throw sessionChanged();
        if (lastRefreshFailure?.session === currentSession && lastRefreshFailure.token === currentAccessToken) {
            throw lastRefreshFailure.error;
        }

        // Request nhận 401 muộn có thể dùng cookie đã được request khác refresh.
        if (accessTokenVersion === currentAccessToken) await refreshAccessToken();
        if (options.signal?.aborted) throw options.signal.reason;
        if (sessionGeneration !== currentSession) throw sessionChanged();

        // Chỉ gửi lại một lần; không retry lỗi mạng hoặc lỗi nghiệp vụ.
        result = await requestOnce(path, options);
    }

    if ((options.method || "GET").toUpperCase() === "POST"
        && ["/auth/login", "/auth/logout", "/auth/change-password", "/auth/reset-password"].includes(pathname)) {
        sessionGeneration += 1;
        accessTokenVersion += 1;
        lastRefreshFailure = null;
    }
    if (pathname === "/auth/me") lastRefreshFailure = null;

    return result;
}

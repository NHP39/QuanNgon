const PROVINCE_API_URL = "https://provinces.open-api.vn/api/v2";
const REQUEST_TIMEOUT_MS = 2000;

async function requestAddressData(path, signal) {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const response = await fetch(`${PROVINCE_API_URL}${path}`, {
        credentials: "omit",
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout
    });
    if (!response.ok) throw new Error("Không tải được dữ liệu địa chỉ.");
    return response.json();
}

function validateOptions(items, provinceCode) {
    if (!Array.isArray(items) || items.length === 0
        || items.some((item) => !item || !Number.isSafeInteger(item.code) || item.code <= 0
            || typeof item.name !== "string" || !item.name.trim() || item.name.length > 255
            || (provinceCode !== undefined && item.province_code !== provinceCode))
        || new Set(items.map((item) => item.code)).size !== items.length) {
        throw new Error("Dữ liệu địa chỉ không hợp lệ.");
    }
    return items.map((item) => ({ code: String(item.code), name: item.name.trim() }))
        .sort((first, second) => first.name.localeCompare(second.name, "vi"));
}

export async function getProvinces({ signal } = {}) {
    return validateOptions(await requestAddressData("/", signal));
}

export async function getWards(provinceCode, { signal } = {}) {
    const code = Number(provinceCode);
    if (!Number.isSafeInteger(code) || code <= 0) throw new Error("Mã tỉnh không hợp lệ.");
    const data = await requestAddressData(`/p/${code}?depth=2`, signal);
    if (!data || data.code !== code) throw new Error("Dữ liệu tỉnh không hợp lệ.");
    return validateOptions(data.wards, code);
}

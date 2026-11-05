import { apiRequest } from "./apiClient";

const statusKeys = ["PENDING", "APPROVED", "REJECTED", "HIDDEN"];
const isCount = (value) => Number.isSafeInteger(value) && value >= 0;

function checkDays(days) {
    if (![7, 30, 90].includes(Number(days))) throw new Error("Khoảng thống kê phải là 7, 30 hoặc 90 ngày.");
}

function toDailyStatistics(data, days, totalKey, listKey, dateKey, countKey) {
    const invalid = () => new Error("Dữ liệu thống kê theo ngày trả về không hợp lệ.");
    if (!data || !isCount(data[totalKey]) || !Array.isArray(data[listKey]) || data[listKey].length !== Number(days)) throw invalid();

    let previousTime = null;
    const series = data[listKey].map((item) => {
        const date = item?.[dateKey];
        const count = item?.[countKey];
        if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isCount(count)) throw invalid();
        const time = Date.parse(`${date}T00:00:00Z`);
        if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date
            || (previousTime !== null && time - previousTime !== 86400000)) throw invalid();
        previousTime = time;
        return { date, count };
    });
    if (series.reduce((sum, item) => sum + item.count, 0) !== data[totalKey]) throw invalid();
    return { total: data[totalKey], series };
}

export async function getUserRegistrationStatistics({ days, signal }) {
    checkDays(days);
    const params = new URLSearchParams({ days: String(days) });
    const data = await apiRequest(`/admin/dashboard/users?${params}`, { signal });
    return toDailyStatistics(data, days, "totalRegistrations", "dailyRegistrations", "registrationDate", "registrationCount");
}

export async function getPostStatistics({ days, signal }) {
    checkDays(days);
    const params = new URLSearchParams({ days: String(days) });
    const data = await apiRequest(`/admin/dashboard/posts?${params}`, { signal });
    return toDailyStatistics(data, days, "totalPosts", "dailyPosts", "postDate", "postCount");
}

export async function getEateryStatusStatistics({ signal }) {
    const data = await apiRequest("/admin/dashboard/eatery-statuses", { signal });
    if (!data || !isCount(data.totalEateries) || !data.countsByStatus
        || statusKeys.some((key) => !isCount(data.countsByStatus[key]))
        || statusKeys.reduce((sum, key) => sum + data.countsByStatus[key], 0) !== data.totalEateries) {
        throw new Error("Dữ liệu thống kê trạng thái trả về không hợp lệ.");
    }
    return { total: data.totalEateries, counts: Object.fromEntries(statusKeys.map((key) => [key, data.countsByStatus[key]])) };
}

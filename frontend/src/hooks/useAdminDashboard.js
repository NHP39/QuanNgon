import { useCallback, useEffect, useState } from "react";
import { getEateryStatusStatistics, getPostStatistics, getUserRegistrationStatistics } from "../services/adminDashboardService";

function useDashboardStatistic(loader, days) {
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState({ data: null, error: null, days: null, attempt: -1 });

    useEffect(() => {
        const controller = new AbortController();
        loader({ days, signal: controller.signal }).then((data) => {
            if (!controller.signal.aborted) setResult({ data, error: null, days, attempt });
        }).catch((error) => {
            if (!controller.signal.aborted) setResult({ data: null, error, days, attempt });
        });
        return () => controller.abort();
    }, [loader, days, attempt]);

    const loading = result.days !== days || result.attempt !== attempt;
    const reload = useCallback(() => setAttempt((current) => current + 1), []);
    return { data: loading ? null : result.data, error: loading ? null : result.error, loading, reload };
}

export function useAdminDashboard(userDays, postDays) {
    const users = useDashboardStatistic(getUserRegistrationStatistics, userDays);
    const statuses = useDashboardStatistic(getEateryStatusStatistics);
    const posts = useDashboardStatistic(getPostStatistics, postDays);
    return { users, statuses, posts };
}

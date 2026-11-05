import { useEffect, useState } from "react";
import { getMyEateries } from "../services/userEateryService";

export const MY_EATERIES_PAGE_SIZE = 10;

export function useMyEateries() {
    const [request, setRequest] = useState({ status: "ALL", page: 0, attempt: 0 });
    const [result, setResult] = useState({ data: null, error: null, request: null });

    useEffect(() => {
        const controller = new AbortController();
        getMyEateries({ ...request, size: MY_EATERIES_PAGE_SIZE, signal: controller.signal }).then((data) => {
            if (controller.signal.aborted) return;
            const lastPage = Math.max(0, data.totalPages - 1);
            if (request.page > lastPage) {
                setRequest((current) => current === request ? { ...current, page: lastPage } : current);
                return;
            }
            setResult({ data, error: null, request });
        }).catch((error) => {
            if (!controller.signal.aborted) setResult({ data: null, error, request });
        });
        return () => controller.abort();
    }, [request]);

    const loading = result.request !== request;
    return {
        data: loading ? null : result.data,
        error: loading ? null : result.error,
        loading,
        status: request.status,
        page: request.page,
        setStatus: (status) => setRequest((current) => current.status === status ? current : { ...current, status, page: 0 }),
        setPage: (page) => setRequest((current) => current.page === page ? current : { ...current, page }),
        reload: () => setRequest((current) => ({ ...current, attempt: current.attempt + 1 }))
    };
}

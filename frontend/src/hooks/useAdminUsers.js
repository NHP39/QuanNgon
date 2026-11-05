import { useCallback, useEffect, useState } from "react";
import { getAdminUsers } from "../services/adminUserService";

const ADMIN_USER_PAGE_SIZE = 8;

export function useAdminUsers() {
    const [query, setQuery] = useState("");
    const [request, setRequest] = useState({ q: "", status: "all", sort: "newest", page: 0 });
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState({ data: null, dataRequest: null, loading: true, error: null, request: null });

    useEffect(() => {
        const timer = setTimeout(() => {
            const q = query.trim();
            setRequest((current) => current.q === q ? current : { ...current, q, page: 0 });
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        const controller = new AbortController();
        getAdminUsers({ ...request, size: ADMIN_USER_PAGE_SIZE, signal: controller.signal }).then((data) => {
            if (controller.signal.aborted) return;
            const lastPage = Math.max(0, data.totalPages - 1);
            if (request.page > lastPage) {
                setRequest((current) => ({ ...current, page: lastPage }));
                return;
            }
            setResult({ data, dataRequest: request, loading: false, error: null, request });
        }).catch((error) => {
            if (!controller.signal.aborted) setResult((current) => ({ ...current, loading: false, error, request }));
        });
        return () => controller.abort();
    }, [request, attempt]);

    const refetch = useCallback(() => {
        setResult((current) => ({ ...current, loading: true, error: null }));
        setAttempt((current) => current + 1);
    }, []);
    const setStatus = useCallback((status) => setRequest((current) => ({ ...current, status, page: 0 })), []);
    const setSort = useCallback((sort) => setRequest((current) => ({ ...current, sort, page: 0 })), []);
    const setPage = useCallback((page) => setRequest((current) => ({ ...current, page })), []);

    return {
        data: result.data,
        hasCurrentData: result.dataRequest === request && result.data !== null,
        loading: result.loading || result.request !== request,
        error: result.request === request ? result.error : null,
        query,
        status: request.status,
        sort: request.sort,
        page: request.page,
        searchPending: query.trim() !== request.q,
        setQuery,
        setStatus,
        setSort,
        setPage,
        refetch
    };
}

import { useCallback, useEffect, useState } from "react";
import { getAdminCategories } from "../services/adminCategoryService";

const ADMIN_CATEGORY_PAGE_SIZE = 7;

export function useAdminCategories() {
    const [query, setQuery] = useState("");
    const [request, setRequest] = useState({ q: "", page: 0 });
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState({ data: null, dataRequest: null, loading: true, error: null, request: null });

    useEffect(() => {
        const timer = setTimeout(() => {
            const q = query.trim();
            setRequest((current) => current.q === q ? current : { q, page: 0 });
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        const controller = new AbortController();
        getAdminCategories({ ...request, size: ADMIN_CATEGORY_PAGE_SIZE, signal: controller.signal }).then((data) => {
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

    const refetch = useCallback(({ resetPage = false } = {}) => {
        setResult((current) => ({ ...current, loading: true, error: null }));
        if (resetPage) setRequest((current) => current.page === 0 ? current : { ...current, page: 0 });
        setAttempt((current) => current + 1);
    }, []);
    const setPage = useCallback((page) => setRequest((current) => current.page === page ? current : { ...current, page }), []);

    return {
        data: result.data,
        hasCurrentData: result.dataRequest === request && result.data !== null,
        loading: result.loading || result.request !== request,
        error: result.request === request ? result.error : null,
        query,
        page: request.page,
        searchPending: query.trim() !== request.q,
        setQuery,
        setPage,
        refetch
    };
}

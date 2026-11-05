import { useEffect, useState } from "react";
import { getCategories, getPublicEateries, getPublicEateryProvinces } from "../services/eateryService";

function useFilterOptions(load) {
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState({ data: [], loading: true, error: null });

    useEffect(() => {
        const controller = new AbortController();
        load({ signal: controller.signal }).then((data) => {
            if (!controller.signal.aborted) setResult({ data, loading: false, error: null });
        }).catch((error) => {
            if (!controller.signal.aborted) setResult({ data: [], loading: false, error });
        });
        return () => controller.abort();
    }, [load, attempt]);

    function retry() {
        setResult({ data: [], loading: true, error: null });
        setAttempt((current) => current + 1);
    }

    return { ...result, retry };
}

export function useExploreEateries(enabled = true) {
    const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
    const [request, setRequest] = useState(() => ({ q: query.trim(), categoryId: "", province: "", page: 0 }));
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState({ data: null, request: null, error: null, loading: true });
    const categories = useFilterOptions(getCategories);
    const provinces = useFilterOptions(getPublicEateryProvinces);

    useEffect(() => {
        const timer = setTimeout(() => {
            const q = query.trim();
            setRequest((current) => current.q === q ? current : { ...current, q, page: 0 });
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        if (!enabled) return undefined;
        const controller = new AbortController();
        getPublicEateries({ ...request, size: 8, signal: controller.signal }).then((data) => {
            if (controller.signal.aborted) return;
            const lastPage = Math.max(0, data.totalPages - 1);
            if (request.page > lastPage) {
                setRequest((current) => ({ ...current, page: lastPage }));
                return;
            }
            setResult({ data, request, error: null, loading: false });
        }).catch((error) => {
            if (!controller.signal.aborted) setResult({ data: null, request, error, loading: false });
        });
        return () => controller.abort();
    }, [request, attempt, enabled]);

    function updateFilter(key, value) {
        setRequest((current) => ({ ...current, q: query.trim(), [key]: value, page: 0 }));
    }

    function clearFilters() {
        setQuery("");
        setRequest({ q: "", categoryId: "", province: "", page: 0 });
    }

    function retry() {
        setResult((current) => ({ ...current, loading: true, error: null }));
        setAttempt((current) => current + 1);
    }

    function updateFavorite(id, isFavorite) {
        setResult((current) => current.data ? { ...current, data: {
            ...current.data, content: current.data.content.map((item) => item.id === id ? { ...item, isFavorite } : item)
        } } : current);
    }

    const loading = !enabled || query.trim() !== request.q || result.request !== request || result.loading;
    return {
        query, setQuery, categoryId: request.categoryId, province: request.province, page: request.page,
        categories, provinces, loading, data: loading ? null : result.data, error: loading ? null : result.error,
        updateCategory: (value) => updateFilter("categoryId", value),
        updateProvince: (value) => updateFilter("province", value),
        setPage: (page) => setRequest((current) => ({ ...current, page })),
        clearFilters, retry, updateFavorite
    };
}

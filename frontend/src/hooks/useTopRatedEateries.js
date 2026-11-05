import { useCallback, useEffect, useState } from "react";
import { getTopRatedEateries } from "../services/eateryService";

export function useTopRatedEateries(enabled = true) {
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState({ items: [], error: null, attempt: -1 });

    useEffect(() => {
        if (!enabled) return undefined;
        const controller = new AbortController();
        getTopRatedEateries({ signal: controller.signal }).then((items) => {
            if (!controller.signal.aborted) setResult({ items, error: null, attempt });
        }).catch((error) => {
            if (!controller.signal.aborted) setResult({ items: [], error, attempt });
        });
        return () => controller.abort();
    }, [attempt, enabled]);

    const loading = !enabled || result.attempt !== attempt;
    const reload = useCallback(() => setAttempt((current) => current + 1), []);
    const updateFavorite = useCallback((id, isFavorite) => setResult((current) => ({
        ...current, items: current.items.map((item) => item.id === id ? { ...item, isFavorite } : item)
    })), []);
    return { items: loading ? [] : result.items, error: loading ? null : result.error, loading, reload, updateFavorite };
}

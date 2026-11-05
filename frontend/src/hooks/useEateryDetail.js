import { useCallback, useEffect, useState } from "react";
import { getPublicEateryDetail } from "../services/eateryService";

export function useEateryDetail(eateryId) {
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState({ data: null, error: null, eateryId: null, attempt: -1 });

    useEffect(() => {
        const controller = new AbortController();
        getPublicEateryDetail(eateryId, { signal: controller.signal }).then((data) => {
            if (!controller.signal.aborted) setResult({ data, error: null, eateryId, attempt });
        }).catch((error) => {
            if (!controller.signal.aborted) setResult({ data: null, error, eateryId, attempt });
        });
        return () => controller.abort();
    }, [eateryId, attempt]);

    const loading = result.eateryId !== eateryId || result.attempt !== attempt;
    const reload = useCallback(() => setAttempt((current) => current + 1), []);
    return {
        data: result.eateryId === eateryId ? result.data : null,
        error: loading ? null : result.error,
        loading,
        reload
    };
}

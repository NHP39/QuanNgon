import { useEffect, useRef, useState } from "react";
import { setEateryFavorite } from "../services/favoriteService";
import { canUseMemberFeatures } from "../utils/permissions";

export function useFavoriteActions({ user, onUpdated, onError }) {
    const pending = useRef(new Set());
    const mounted = useRef(false);
    const [pendingIds, setPendingIds] = useState(new Set());

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    async function toggleFavorite(id, currentFavorite) {
        if (!user) { window.location.assign("/login"); return; }
        if (!canUseMemberFeatures(user)) {
            onError(new Error("Tài khoản này không được phép sử dụng chức năng yêu thích."));
            return;
        }
        if (pending.current.has(id)) return;
        pending.current.add(id);
        setPendingIds(new Set(pending.current));
        onError(null);
        try {
            await setEateryFavorite(id, !currentFavorite);
            if (mounted.current) onUpdated(id, !currentFavorite);
        } catch (error) {
            if (mounted.current) onError(error);
        } finally {
            pending.current.delete(id);
            if (mounted.current) setPendingIds(new Set(pending.current));
        }
    }

    return { toggleFavorite, pendingIds };
}

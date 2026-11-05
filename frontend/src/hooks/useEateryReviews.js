import { useEffect, useRef, useState } from "react";
import { getCurrentUserReview, getPublicEateryReviews } from "../services/reviewService";
import { canUseMemberFeatures } from "../utils/permissions";

function sessionChanged() {
    const error = new Error("Phiên đăng nhập đã thay đổi. Vui lòng kiểm tra lại phiên để tải đánh giá.");
    error.sessionChanged = true;
    return error;
}

export function useEateryReviews(eateryId, user) {
    const [request, setRequest] = useState({ sort: "newest", page: 0, attempt: 0 });
    const [result, setResult] = useState({ items: [], page: -1, sort: null, totalElements: 0, totalPages: 0, error: null, request: null });
    const [ownAttempt, setOwnAttempt] = useState(0);
    const [ownResult, setOwnResult] = useState({ data: null, error: null, attempt: -1 });
    const listBusy = useRef(false);
    const ownBusy = useRef(false);
    const member = canUseMemberFeatures(user);
    const viewerId = user?.userId;

    useEffect(() => {
        const controller = new AbortController();
        listBusy.current = true;
        getPublicEateryReviews(eateryId, { ...request, signal: controller.signal }).then((data) => {
            if (controller.signal.aborted) return;
            if (viewerId && data.content.some((review) => review.author.userId === viewerId)) throw sessionChanged();
            setResult((current) => {
                const previous = request.page > 0 && current.sort === request.sort ? current.items : [];
                const items = [...new Map([...previous, ...data.content].map((review) => [review.id, review])).values()];
                return { items, page: data.page, sort: request.sort, totalElements: data.totalElements, totalPages: data.totalPages, error: null, request };
            });
        }).catch((error) => {
            if (!controller.signal.aborted) setResult((current) => ({ ...current, error, request }));
        }).finally(() => {
            if (!controller.signal.aborted) listBusy.current = false;
        });
        return () => controller.abort();
    }, [eateryId, viewerId, request]);

    useEffect(() => {
        if (!member) return undefined;
        const controller = new AbortController();
        ownBusy.current = true;
        getCurrentUserReview(eateryId, { signal: controller.signal }).then((data) => {
            if (controller.signal.aborted) return;
            if (data && data.author.userId !== viewerId) throw sessionChanged();
            setOwnResult({ data, error: null, attempt: ownAttempt });
        }).catch((error) => {
            if (!controller.signal.aborted) setOwnResult({ data: null, error, attempt: ownAttempt });
        }).finally(() => {
            if (!controller.signal.aborted) ownBusy.current = false;
        });
        return () => controller.abort();
    }, [eateryId, member, viewerId, ownAttempt]);

    const loading = result.request !== request;
    const ownLoading = member && ownResult.attempt !== ownAttempt;
    const error = loading ? null : result.error;
    const ownError = ownLoading ? null : ownResult.error;
    const needsSessionCheck = [error, ownError].some((failure) => failure?.status === 401 || failure?.sessionChanged);
    const hasMore = result.page + 1 < result.totalPages;

    function loadMore() {
        if (listBusy.current || loading || error || needsSessionCheck || !hasMore) return;
        listBusy.current = true;
        setRequest((current) => ({ ...current, page: result.page + 1 }));
    }

    function retryList() {
        if (listBusy.current || loading) return;
        listBusy.current = true;
        setRequest((current) => ({ ...current, attempt: current.attempt + 1 }));
    }

    function changeSort(sort) {
        if (sort === request.sort) return;
        listBusy.current = true;
        setRequest({ sort, page: 0, attempt: 0 });
    }

    function retryOwn() {
        if (ownBusy.current || ownLoading) return;
        ownBusy.current = true;
        setOwnAttempt((current) => current + 1);
    }

    function refreshReviews() {
        setOwnAttempt((current) => current + 1);
        setRequest((current) => ({ ...current, page: 0, attempt: current.attempt + 1 }));
    }

    return {
        items: result.sort === request.sort && !(loading && request.page === 0) ? result.items : [],
        loading, error, hasMore, totalElements: result.totalElements,
        currentUserReview: member && !ownLoading ? ownResult.data : null,
        ownLoading, ownError, needsSessionCheck, sort: request.sort,
        loadMore, retryList, changeSort, retryOwn, refreshReviews
    };
}

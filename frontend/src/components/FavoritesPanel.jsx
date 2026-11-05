import { isConnectionError } from "../services/apiClient";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, RotateCcw, Search } from "lucide-react";
import { EateryCard } from "./EateryCard";
import { PageLoadError } from "./PageLoadError";
import { FAVORITES_PAGE_SIZE, getMyFavorites } from "../services/favoriteService";
import { useFavoriteActions } from "../hooks/useFavoriteActions";

export function FavoritesPanel({ user }) {
    const [page, setPage] = useState(0);
    const [notice, setNotice] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState({ data: null, error: null, page: -1, attempt: -1 });
    const [actionError, setActionError] = useState(null);
    const loading = result.page !== page || result.attempt !== attempt;
    const data = loading ? null : result.data;
    const error = loading ? null : result.error;
    const needsLogin = (actionError || error)?.status === 401;
    const { toggleFavorite, pendingIds } = useFavoriteActions({ user, onError: setActionError,
        onUpdated: () => { setNotice("Đã bỏ yêu thích quán ăn."); setAttempt((value) => value + 1); }
    });

    useEffect(() => {
        const controller = new AbortController();
        getMyFavorites({ page, signal: controller.signal }).then((data) => {
            if (controller.signal.aborted) return;
            const lastPage = Math.max(0, data.totalPages - 1);
            if (page > lastPage) { setPage(lastPage); return; }
            setResult({ data, error: null, page, attempt });
        }).catch((error) => {
            if (!controller.signal.aborted) setResult({ data: null, error, page, attempt });
        });
        return () => controller.abort();
    }, [page, attempt]);

    return <section className="account-list-section" aria-labelledby="account-favorites-heading" aria-busy={loading}>
        <div className="account-section-heading"><div><h2 id="account-favorites-heading">Quán ăn yêu thích</h2><p>{data ? `${data.totalElements} quán ăn đã lưu` : "Các quán ăn bạn đã lưu"}</p></div><a className="account-outline" href="/explore"><Search aria-hidden="true" /> Khám phá</a></div>
        {actionError && <p className="account-form-error" role="alert">{actionError.message}</p>}
        {needsLogin && <a className="account-outline" href="/login">Đăng nhập lại</a>}
        {notice && !actionError && <p className="account-owned-notice" role="status">{notice}</p>}
        {loading ? <p className="account-loading" role="status">Đang tải quán yêu thích...</p>
            : isConnectionError(error) ? <PageLoadError onRetry={() => setAttempt((value) => value + 1)} />
                : error ? <div className="account-empty" role="alert"><strong>Không tải được quán yêu thích</strong><p>{error.message}</p>{!needsLogin && <button type="button" className="account-outline" onClick={() => setAttempt((value) => value + 1)}><RotateCcw aria-hidden="true" />Thử lại</button>}</div>
                : data.content.length ? <div className="account-favorites-grid">{data.content.map((eatery) => <EateryCard key={eatery.id} eatery={eatery} favorite={eatery.isFavorite} canFavorite onFavorite={toggleFavorite} favoritePending={pendingIds.has(eatery.id)} />)}</div>
                    : <div className="account-empty"><Heart aria-hidden="true" /><strong>Chưa có quán ăn yêu thích</strong><a href="/explore">Khám phá quán ăn</a></div>}
        {data?.totalElements > 0 && <div className="account-owned-pagination"><span>Hiển thị {page * FAVORITES_PAGE_SIZE + 1}–{page * FAVORITES_PAGE_SIZE + data.content.length} / {data.totalElements} quán</span>
            <nav aria-label="Phân trang quán yêu thích"><button type="button" aria-label="Trang trước" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft aria-hidden="true" /></button>
                <span>Trang {page + 1}/{data.totalPages}</span><button type="button" aria-label="Trang sau" disabled={page + 1 >= data.totalPages} onClick={() => setPage(page + 1)}><ChevronRight aria-hidden="true" /></button></nav></div>}
    </section>;
}

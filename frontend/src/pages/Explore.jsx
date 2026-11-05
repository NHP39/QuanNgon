import { isConnectionError, getApiErrorMessage } from "../services/apiClient";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, MapPin, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { loadCurrentUser, logout } from "../services/authService";
import { UserFooter, UserHeader } from "../components/UserLayout";
import { EateryCard } from "../components/EateryCard";
import { PageLoadError } from "../components/PageLoadError";
import { useFavoriteActions } from "../hooks/useFavoriteActions";
import { canUseMemberFeatures } from "../utils/permissions";
import { useExploreEateries } from "../hooks/useExploreEateries";
import "./Explore.css";

function FilterError({ error, onRetry }) {
    return <div className="explore-filter-error" role="alert"><p>{getApiErrorMessage(error, "Chưa tải được bộ lọc.")}</p><button type="button" onClick={onRetry}><RotateCcw aria-hidden="true" />Thử lại</button></div>;
}

function pageNumbers(page, total) {
    if (total <= 7) return Array.from({ length: total }, (_, index) => index);
    const pages = [0, page - 1, page, page + 1, total - 1].filter((value) => value >= 0 && value < total);
    return [...new Set(pages)].sort((a, b) => a - b).flatMap((value, index, values) =>
        index > 0 && value - values[index - 1] > 1 ? [`gap-${value}`, value] : [value]);
}

function Explore() {
    const [user, setUser] = useState(null);
    const [sessionLoading, setSessionLoading] = useState(true);
    const { query, setQuery, categoryId, province, page, categories, provinces, loading, data, error,
        updateCategory, updateProvince, setPage, clearFilters, retry, updateFavorite } = useExploreEateries(!sessionLoading);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [sessionError, setSessionError] = useState("");
    const { toggleFavorite, pendingIds } = useFavoriteActions({
        user, onUpdated: updateFavorite, onError: (error) => setSessionError(getApiErrorMessage(error))
    });

    useEffect(() => {
        let active = true;
        loadCurrentUser().then((account) => {
            if (active) {
                setUser(account);
            }
        }).catch(() => {}).finally(() => { if (active) setSessionLoading(false); });
        return () => { active = false; };
    }, []);

    async function handleLogout() {
        setSessionError("");
        try {
            await logout();
            window.location.assign("/login");
        } catch (error) {
            setSessionError(getApiErrorMessage(error, "Không thể đăng xuất."));
        }
    }

    if (isConnectionError(error)) {
        return <PageLoadError fullPage />;
    }

    return (
        <div className="explore-page">
            <UserHeader active="explore" user={user} onLogout={handleLogout} />
            {sessionError && <div className="explore-session-error" role="alert">{sessionError}<button type="button" aria-label="Đóng thông báo" title="Đóng" onClick={() => setSessionError("")}><X aria-hidden="true" /></button></div>}
            <main className="explore-main">
                <aside className="explore-filters" aria-label="Bộ lọc quán ăn">
                    <h2>Bộ lọc</h2>
                    <button type="button" className="explore-filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal aria-hidden="true" /> Bộ lọc <ChevronDown aria-hidden="true" /></button>
                    <div className={`explore-filter-body ${filtersOpen ? "is-open" : ""}`}>
                    <p>Khám phá theo khẩu vị</p>
                    <fieldset className="explore-filter-group">
                        <legend>Danh mục</legend>
                        <div className="explore-category-list">
                            <button type="button" className={!categoryId ? "is-selected" : ""} aria-pressed={!categoryId} onClick={() => updateCategory("")}>Tất cả</button>
                            {categories.data.map((item) => <button type="button" key={item.id} className={categoryId === item.id ? "is-selected" : ""} aria-pressed={categoryId === item.id} onClick={() => updateCategory(item.id)}>{item.name}</button>)}
                        </div>
                        {categories.loading && <p className="explore-filter-note" role="status">Đang tải danh mục…</p>}
                        {categories.error && <FilterError error={categories.error} onRetry={categories.retry} />}
                        {!categories.loading && !categories.error && !categories.data.length && <p className="explore-filter-note">Chưa có danh mục.</p>}
                    </fieldset>
                    <label className="explore-province-label" htmlFor="explore-province">Tỉnh/Thành phố</label>
                    <div className="explore-select-wrap"><MapPin aria-hidden="true" /><select id="explore-province" value={province} disabled={provinces.loading || !!provinces.error || !provinces.data.length} onChange={(event) => updateProvince(event.target.value)}><option value="">{provinces.loading ? "Đang tải tỉnh/thành…" : "Tất cả tỉnh/thành phố"}</option>{provinces.data.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                    {provinces.error && <FilterError error={provinces.error} onRetry={provinces.retry} />}
                    {!provinces.loading && !provinces.error && !provinces.data.length && <p className="explore-filter-note">Chưa có tỉnh/thành có quán được duyệt.</p>}
                    <button type="button" className="explore-reset" onClick={clearFilters}><RotateCcw aria-hidden="true" />Xóa bộ lọc</button>
                    </div>
                </aside>

                <section className="explore-content" aria-label="Danh sách quán ăn">
                    <div className="explore-toolbar">
                        <div className="explore-intro">
                            <span className="explore-eyebrow">KHÁM PHÁ QUÁN ĂN</span>
                            <h1>Tất cả quán ăn{province && <> tại <em>{province}</em></>}</h1>
                            <p>Khám phá những địa điểm ăn uống ngon, chất lượng.</p>
                        </div>
                        <label className="explore-search"><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên quán, món ăn, ..." aria-label="Tìm quán ăn" /></label>
                    </div>

                    <div aria-busy={loading}>
                        {loading ? <><p className="explore-result-note" role="status">Đang tải quán ăn…</p><div className="explore-grid" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <div className="explore-card-placeholder" key={index}><div /><span /><span /></div>)}</div></>
                            : error ? <div className="explore-empty" role="alert"><h2>Không tải được danh sách quán</h2><p>{error.message}</p><button type="button" className="explore-reset" onClick={retry}><RotateCcw aria-hidden="true" />Thử lại</button></div>
                                : data?.content.length ? <><p className="explore-result-note" role="status">{data.totalElements} quán ăn · Trang {page + 1}/{data.totalPages}</p><div className="explore-grid">{data.content.map((eatery) => <EateryCard key={eatery.id} eatery={eatery} favorite={eatery.isFavorite} onFavorite={toggleFavorite} favoritePending={pendingIds.has(eatery.id)} canFavorite={!user || canUseMemberFeatures(user)} />)}</div></>
                                    : <div className="explore-empty" role="status"><Search aria-hidden="true" /><h2>Không tìm thấy quán ăn</h2><p>Thử tên quán hoặc bộ lọc khác nhé.</p><button type="button" className="explore-reset" onClick={clearFilters}><RotateCcw aria-hidden="true" />Xóa bộ lọc</button></div>}
                    </div>

                    {data?.totalPages > 1 && <nav className="explore-pagination" aria-label="Phân trang quán ăn">
                        <button type="button" aria-label="Trang trước" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft aria-hidden="true" /></button>
                        {pageNumbers(page, data.totalPages).map((number) => typeof number === "string" ? <span key={number} aria-hidden="true">…</span> : <button type="button" key={number} aria-label={`Trang ${number + 1}`} className={page === number ? "is-current" : ""} aria-current={page === number ? "page" : undefined} onClick={() => setPage(number)}>{number + 1}</button>)}
                        <button type="button" aria-label="Trang sau" disabled={page === data.totalPages - 1} onClick={() => setPage(page + 1)}><ChevronRight aria-hidden="true" /></button>
                    </nav>}
                </section>
            </main>
            <UserFooter />
        </div>
    );
}

export default Explore;

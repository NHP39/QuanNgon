import { isConnectionError, getApiErrorMessage } from "../services/apiClient";
import { useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, RefreshCw, Search, X } from "lucide-react";
import { loadCurrentUser, logout } from "../services/authService";
import { UserFooter, UserHeader } from "../components/UserLayout";
import { HomeHeroTitle } from "../components/HomeHeroTitle";
import { EateryCard } from "../components/EateryCard";
import { PageLoadError } from "../components/PageLoadError";
import { useFavoriteActions } from "../hooks/useFavoriteActions";
import { canUseMemberFeatures } from "../utils/permissions";
import { useTopRatedEateries } from "../hooks/useTopRatedEateries";
import "./Home.css";

function Home() {
    const [sessionLoading, setSessionLoading] = useState(true);
    const { items: featured, loading, error, reload, updateFavorite } = useTopRatedEateries(!sessionLoading);
    const [user, setUser] = useState(null);
    const [search, setSearch] = useState("");
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

    function handleSearch(event) {
        event.preventDefault();
        const term = search.trim();
        window.location.assign(term ? `/explore?q=${encodeURIComponent(term)}` : "/explore");
    }

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
        <div className="home-page">
            <UserHeader active="home" user={user} onLogout={handleLogout} />
            {sessionError && <div className="home-session-error" role="alert">{sessionError}<button type="button" aria-label="Đóng thông báo" title="Đóng" onClick={() => setSessionError("")}><X aria-hidden="true" /></button></div>}

            <main>
                <section className="home-hero" aria-labelledby="home-title">
                    <div className="home-inner home-hero-inner">
                        <div className="home-hero-copy">
                            <span className="home-eyebrow">DISCOVERY GUIDE</span>
                            <HomeHeroTitle />
                            <form className="home-search" onSubmit={handleSearch}>
                                <Search aria-hidden="true" />
                                <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" aria-label="Tìm quán ăn" placeholder="Gõ món ăn hoặc tên quán..." />
                                <button type="submit">Tìm ngay</button>
                            </form>
                        </div>
                    </div>
                </section>

                <section className="home-featured" aria-labelledby="home-featured-title">
                    <div className="home-inner">
                        <div className="home-section-heading home-featured-heading">
                            <div>
                                <h2 id="home-featured-title">Điểm hẹn ẩm thực nổi bật</h2>
                                <p>Những quán ăn có điểm đánh giá cao nhất từ cộng đồng.</p>
                            </div>
                        </div>
                        {loading ? <>
                            <p className="home-featured-loading" role="status"><LoaderCircle aria-hidden="true" />Đang tải quán ăn nổi bật...</p>
                            <div className="home-featured-grid" aria-hidden="true">
                                {[0, 1, 2].map((index) => <div className="home-card-skeleton" key={index}><div className="home-card-skeleton-image" /><div className="home-card-skeleton-body"><span /><span /><span /></div></div>)}
                            </div>
                        </> : error ? <div className="home-featured-state" role="alert">
                            <p>{error.message || "Không thể tải quán ăn nổi bật. Vui lòng thử lại."}</p>
                            <button type="button" onClick={reload}><RefreshCw aria-hidden="true" />Thử lại</button>
                        </div> : featured.length ? <div className="home-featured-grid">
                            {featured.map((eatery) => (
                                <EateryCard key={eatery.id} eatery={eatery} favorite={eatery.isFavorite} onFavorite={toggleFavorite} favoritePending={pendingIds.has(eatery.id)} canFavorite={!user || canUseMemberFeatures(user)} />
                            ))}
                        </div> : <div className="home-featured-state" role="status">
                            <p>Chưa có quán ăn được đánh giá.</p>
                            <a href="/explore">Khám phá quán ăn<ArrowRight aria-hidden="true" /></a>
                        </div>}
                    </div>
                </section>

                <section className="home-contribute" aria-labelledby="home-contribute-title">
                    <div className="home-inner home-contribute-inner">
                        <div>
                            <h2 id="home-contribute-title">Bạn biết một quán ăn cực ngon mà chưa có trên đây?</h2>
                            <p>Hãy giúp cộng đồng khám phá thêm nhiều địa điểm ăn uống tuyệt vời tại Thủ Đức bằng cách chia sẻ trải nghiệm của bạn.</p>
                        </div>
                        <a href="/eateries/new">Chia sẻ quán ăn của bạn</a>
                    </div>
                </section>
            </main>
            <UserFooter />
        </div>
    );
}

export default Home;

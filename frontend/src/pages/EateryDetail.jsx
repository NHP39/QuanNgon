import { isConnectionError, getApiErrorMessage } from "../services/apiClient";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Phone, RotateCcw, Search, Star, X } from "lucide-react";
import { loadCurrentUser, logout } from "../services/authService";
import { UserFooter, UserHeader } from "../components/UserLayout";
import { EateryPhotoGallery } from "../components/EateryPhotoGallery";
import { EateryReviews } from "../components/EateryReviews";
import { PageLoadError } from "../components/PageLoadError";
import { useEateryDetail } from "../hooks/useEateryDetail";
import "./EateryDetail.css";

function validateViewer(user) {
    if (!user || !Number.isSafeInteger(user.userId) || user.userId <= 0
        || typeof user.fullName !== "string" || !user.fullName.trim()
        || typeof user.email !== "string" || !user.email.trim() || typeof user.role !== "string") {
        throw new Error("Thông tin phiên đăng nhập trả về không hợp lệ.");
    }
    return user;
}

async function readViewer() {
    try { return validateViewer(await loadCurrentUser()); }
    catch (error) {
        if (error.status === 401) return null;
        throw error;
    }
}

function EateryDetail() {
    const eateryId = Number(window.location.pathname.split("/")[2]);
    const [session, setSession] = useState({ user: null, loading: true, error: null });
    const [sessionAttempt, setSessionAttempt] = useState(0);
    const [sessionError, setSessionError] = useState("");
    const { data: eatery, loading, error, reload } = useEateryDetail(eateryId);

    useEffect(() => {
        let active = true;
        readViewer().then((user) => {
            if (active) setSession({ user, loading: false, error: null });
        }).catch((error) => {
            if (active) setSession({ user: null, loading: false, error });
        });
        return () => { active = false; };
    }, [sessionAttempt]);

    function retrySession() {
        setSession({ user: null, loading: true, error: null });
        setSessionAttempt((current) => current + 1);
    }

    async function handleLogout() {
        setSessionError("");
        try { await logout(); window.location.assign("/login"); }
        catch (failure) { setSessionError(getApiErrorMessage(failure, "Không thể đăng xuất.")); }
    }

    if (isConnectionError(error)) return <PageLoadError fullPage />;

    const address = eatery && [eatery.address.street, eatery.address.ward, eatery.address.province].map((part) => part.trim()).filter(Boolean).join(", ");

    return <div className="eatery-detail-page">
        <UserHeader active="explore" user={session.user} onLogout={handleLogout} />
        {sessionError && <div className="detail-session-error" role="alert">{sessionError}<button type="button" title="Đóng" aria-label="Đóng thông báo" onClick={() => setSessionError("")}><X aria-hidden="true" /></button></div>}
        <main className="detail-main" aria-busy={loading}>
            {error ? <section className="detail-not-found" role="alert"><Search aria-hidden="true" /><h1>{error.status === 404 ? "Không tìm thấy quán ăn" : "Không tải được thông tin quán"}</h1>
                <p>{error.status === 404 ? "Quán không tồn tại hoặc hiện không được công khai." : error.message}</p>
                {error.status !== 404 && <button type="button" className="detail-write-button" onClick={reload}><RotateCcw aria-hidden="true" />Thử lại</button>}
                <a href="/explore"><ArrowLeft aria-hidden="true" /> Quay lại Khám phá</a></section>
                : !eatery ? <section className="detail-loading" role="status"><p>Đang tải thông tin quán ăn...</p><div className="detail-loading-photo" aria-hidden="true" /><div className="detail-loading-info" aria-hidden="true" /></section>
                    : <>
                        <EateryPhotoGallery key={`${eatery.id}:${eatery.images.map((image) => `${image.id}:${image.imageUrl}`).join("|")}`} images={eatery.images} name={eatery.name} />
                        <section className="detail-info" aria-labelledby="detail-title">
                            <h1 id="detail-title">{eatery.name}</h1>
                            <div className="detail-info-meta"><span className="detail-info-rating">{eatery.reviewCount === 0 ? "Chưa có đánh giá" : <><Star aria-hidden="true" /><strong>{eatery.averageRating.toFixed(1)}</strong><span>({eatery.reviewCount} đánh giá)</span></>}</span><span className="detail-info-category">{eatery.category.name}</span></div>
                            <p className="detail-description">{eatery.content}</p>
                            {eatery.phoneContact && <a className="detail-phone" href={`tel:${eatery.phoneContact.replace(/\s/g, "")}`}><Phone aria-hidden="true" />{eatery.phoneContact}</a>}
                            <p className="detail-address"><MapPin aria-hidden="true" /><span>{address || "Chưa cập nhật địa chỉ"}</span></p>
                        </section>
                        {session.loading ? <section className="detail-reviews" aria-label="Đánh giá"><p className="detail-review-loading" role="status">Đang tải đánh giá...</p></section>
                            : session.error ? <section className="detail-reviews detail-review-feedback" role="alert"><p>Chưa xác minh được phiên để tải đánh giá. {getApiErrorMessage(session.error)}</p><button type="button" onClick={retrySession}><RotateCcw aria-hidden="true" />Thử lại</button></section>
                                : <EateryReviews key={`${eatery.id}:${session.user?.userId ?? "guest"}`} eatery={eatery} user={session.user} onRetrySession={retrySession} onReviewChanged={reload} />}
                    </>}
        </main>
        <UserFooter />
    </div>;
}

export default EateryDetail;

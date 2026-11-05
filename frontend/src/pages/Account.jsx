import { isConnectionError, getApiErrorMessage } from "../services/apiClient";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CircleUserRound, Heart, KeyRound, Store, X } from "lucide-react";
import { loadCurrentUser, logout } from "../services/authService";
import { UserFooter, UserHeader } from "../components/UserLayout";
import { ChangePasswordForm } from "../components/ChangePasswordForm";
import { AccountProfilePanel } from "../components/AccountProfilePanel";
import { FavoritesPanel } from "../components/FavoritesPanel";
import { AccountEditEateryPanel } from "../components/AccountEditEateryPanel";
import { OwnedEateriesPanel } from "../components/OwnedEateriesPanel";
import { PageLoadError } from "../components/PageLoadError";
import { canUseMemberFeatures } from "../utils/permissions";
import "./Account.css";

const sections = [
    { href: "/account", label: "Quản lý tài khoản", icon: CircleUserRound },
    { href: "/account/password", label: "Đổi mật khẩu", icon: KeyRound },
    { href: "/account/eateries", label: "Quán ăn đã chia sẻ", icon: Store },
    { href: "/account/favorites", label: "Quán ăn yêu thích", icon: Heart }
];

function AccountNav({ active }) {
    return <nav className="account-side-nav" aria-label="Quản lý tài khoản">
        {sections.map(({ href, label, icon: Icon }) => <a key={href} href={href} className={active === href ? "is-active" : ""} aria-current={active === href ? "page" : undefined}><Icon aria-hidden="true" />{label}</a>)}
    </nav>;
}

function PasswordPanel() {
    return <section className="account-panel account-password-panel" aria-labelledby="account-password-heading">
        <div className="account-panel-heading"><div><h2 id="account-password-heading">Đổi mật khẩu</h2></div><KeyRound aria-hidden="true" /></div>
        <p className="account-password-description">Nhập mật khẩu hiện tại và mật khẩu mới.</p>
        <ChangePasswordForm />
    </section>;
}

function Account() {
    const path = window.location.pathname.replace(/\/$/, "");
    const editId = path.match(/^\/account\/eateries\/([^/]+)\/edit$/)?.[1];
    const active = editId ? "/account/eateries" : path || "/account";
    const [session, setSession] = useState({ loading: true, user: null, error: null });
    const [lightbox, setLightbox] = useState(null);
    const [pageError, setPageError] = useState("");

    useEffect(() => {
        let activeRequest = true;
        loadCurrentUser().then((user) => {
            if (!activeRequest) return;
            setSession({ loading: false, user, error: null });
        }).catch((error) => { if (activeRequest) {
            setSession({ loading: false, user: null, error });
        } });
        return () => { activeRequest = false; };
    }, []);

    useEffect(() => {
        if (!lightbox) return undefined;
        function onKey(event) {
            if (event.key === "Escape") setLightbox(null);
            if (event.key === "ArrowLeft") setLightbox((current) => ({ ...current, index: (current.index - 1 + current.images.length) % current.images.length }));
            if (event.key === "ArrowRight") setLightbox((current) => ({ ...current, index: (current.index + 1) % current.images.length }));
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [lightbox]);

    async function handleLogout() {
        try { await logout(); window.location.assign("/login"); }
        catch (error) { setPageError(getApiErrorMessage(error, "Không thể đăng xuất.")); }
    }
    if (isConnectionError(session.error)) return <PageLoadError fullPage />;

    const heading = editId ? "Chỉnh sửa quán ăn" : sections.find((item) => item.href === active)?.label || "Quản lý tài khoản";
    const passwordPage = active === "/account/password";
    const pageHeading = <div className="account-page-heading">{!passwordPage && <span>TÀI KHOẢN</span>}<h1>{heading}</h1></div>;

    return <div className="account-page">
        <UserHeader user={session.user} onLogout={handleLogout} />
        <main className="account-main">
            {pageHeading}
            {pageError && <p className="account-form-error" role="alert">{pageError}</p>}
            {session.loading ? <div className="account-loading">Đang tải tài khoản...</div> : session.user && !canUseMemberFeatures(session.user) ? <div className="account-loading" role="alert"><h2>Không có quyền truy cập</h2><p>Tài khoản này không được phép truy cập chức năng thành viên.</p><a href="/home">Về trang chủ</a></div> : !session.user ? <div className="account-loading" role="alert"><h2>Cần đăng nhập</h2><p>{session.error?.status === 401 || session.error?.status === 403 ? "Đăng nhập để quản lý tài khoản của bạn." : session.error?.message || "Không thể xác minh phiên đăng nhập."}</p><a href="/login">Về trang đăng nhập</a></div> : <div className="account-layout">
                <aside className="account-sidebar"><div className="account-sidebar-user"><span className="account-sidebar-avatar"><CircleUserRound aria-hidden="true" /></span><div><strong>{session.user.fullName}</strong><small>{session.user.email}</small></div></div><AccountNav active={active} /></aside>
                <div className="account-content">
                    {active === "/account" && <AccountProfilePanel key={session.user.userId} user={session.user} onSaved={(updatedUser) => setSession((current) => ({ ...current, user: { ...current.user, ...updatedUser } }))} />}
                    {passwordPage && <PasswordPanel />}
                    {active === "/account/eateries" && !editId && <OwnedEateriesPanel key={session.user.userId} onPreview={(images, index) => setLightbox({ images, index })} />}
                    {active === "/account/favorites" && <FavoritesPanel key={session.user.userId} user={session.user} />}
                    {editId && <AccountEditEateryPanel key={`${session.user.userId}-${editId}`} eateryId={editId} />}
                </div>
            </div>}
        </main>
        <UserFooter />
        {lightbox && <div className="account-lightbox-backdrop" onMouseDown={() => setLightbox(null)}><section className="account-lightbox" role="dialog" aria-modal="true" aria-label="Xem ảnh quán ăn" onMouseDown={(event) => event.stopPropagation()}><div className="account-lightbox-top"><span>{lightbox.index + 1} / {lightbox.images.length}</span><button type="button" title="Đóng" aria-label="Đóng ảnh" onClick={() => setLightbox(null)}><X aria-hidden="true" /></button></div><div className="account-lightbox-stage">{lightbox.images.length > 1 && <button type="button" title="Ảnh trước" aria-label="Ảnh trước" onClick={() => setLightbox((current) => ({ ...current, index: (current.index - 1 + current.images.length) % current.images.length }))}><ChevronLeft aria-hidden="true" /></button>}<div className="account-lightbox-image"><img src={lightbox.images[lightbox.index]} alt={`Ảnh ${lightbox.index + 1} của quán ăn`} /></div>{lightbox.images.length > 1 && <button type="button" title="Ảnh sau" aria-label="Ảnh sau" onClick={() => setLightbox((current) => ({ ...current, index: (current.index + 1) % current.images.length }))}><ChevronRight aria-hidden="true" /></button>}</div></section></div>}
    </div>;
}

export default Account;

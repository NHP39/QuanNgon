import { isConnectionError, getApiErrorMessage } from "../services/apiClient";
import { useEffect, useState } from "react";
import { CircleUserRound, Home, List, LogIn, LogOut, Store, UsersRound, X } from "lucide-react";
import { loadCurrentUser, logout } from "../services/authService";
import { isAdmin } from "../utils/permissions";
import { PageLoadError } from "./PageLoadError";
import "./AdminLayout.css";

const navigation = [
    { key: "overview", href: "/admin/overview", label: "Tổng quan", icon: Home },
    { key: "users", href: "/admin/users", label: "Quản lý người dùng", icon: UsersRound },
    { key: "eateries", href: "/admin/eateries", label: "Quản lý quán ăn", icon: Store },
    { key: "categories", href: "/admin/categories", label: "Quản lý danh mục", icon: List }
];

export function AdminLayout({ active, children }) {
    const [session, setSession] = useState({ loading: true, user: null, error: null });
    const [attempt, setAttempt] = useState(0);
    const [logoutError, setLogoutError] = useState("");

    useEffect(() => {
        let mounted = true;
        loadCurrentUser().then((user) => {
            if (mounted) setSession({ loading: false, user, error: null });
        }).catch((error) => {
            if (mounted) setSession({ loading: false, user: null, error });
        });
        return () => { mounted = false; };
    }, [attempt]);

    async function handleLogout() {
        if (!session.user) { window.location.assign("/login"); return; }
        try { await logout(); window.location.assign("/login"); }
        catch (error) { setLogoutError(getApiErrorMessage(error, "Không thể đăng xuất.")); }
    }

    const denied = session.user && !isAdmin(session.user);

    if (isConnectionError(session.error)) return <PageLoadError fullPage onRetry={() => {
        setSession({ loading: true, user: null, error: null });
        setAttempt((current) => current + 1);
    }} />;

    return <div className="admin-page">
        <header className="admin-topbar">
            <a href="/admin/overview" className="admin-brand">Quán Ngon</a>
            <div className="admin-topbar-actions">
                <a href="/home" className="admin-back-home"><Home aria-hidden="true" />Về trang chủ</a>
                <button type="button" className="admin-logout" onClick={handleLogout}>{session.user ? <LogOut aria-hidden="true" /> : <LogIn aria-hidden="true" />}{session.user ? "Đăng xuất" : "Đăng nhập"}</button>
            </div>
        </header>
        {session.loading ? <main className="admin-gate">Đang tải trang quản trị...</main> : denied ? <main className="admin-gate"><h1>Không có quyền truy cập</h1><p>Trang này chỉ dành cho quản trị viên.</p><a href="/home">Về trang chủ</a></main> : !session.user ? <main className="admin-gate"><h1>{session.error?.status === 401 || session.error?.status === 403 ? "Cần đăng nhập" : "Không thể xác minh phiên đăng nhập"}</h1><p>{session.error?.status === 401 || session.error?.status === 403 ? "Đăng nhập bằng tài khoản quản trị để tiếp tục." : session.error?.message}</p><div className="admin-gate-actions"><a href="/login">Đăng nhập</a><button type="button" onClick={() => { setSession({ loading: true, user: null, error: null }); setAttempt((current) => current + 1); }}>Thử lại</button></div></main> : <div className="admin-body">
            <aside className="admin-sidebar">
                <nav className="admin-side-nav" aria-label="Điều hướng quản trị">
                    {navigation.map(({ key, href, label, icon: Icon }) => <a key={key} href={href} className={`admin-side-item ${active === key ? "is-active" : ""}`} aria-current={active === key ? "page" : undefined}><Icon aria-hidden="true" />{label}</a>)}
                </nav>
                <div className="admin-sidebar-account"><span className="admin-sidebar-avatar"><CircleUserRound aria-hidden="true" /></span><span className="admin-sidebar-identity"><strong>{session.user.fullName}</strong><small>Quản trị viên</small></span></div>
            </aside>
            <main className="admin-main">
                {logoutError && <div className="admin-layout-error" role="alert">{logoutError}<button type="button" aria-label="Đóng thông báo" title="Đóng thông báo" onClick={() => setLogoutError("")}><X aria-hidden="true" /></button></div>}
                {children}
            </main>
        </div>}
    </div>;
}

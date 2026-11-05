import { useEffect, useRef } from "react";
import { CircleUserRound, Heart, KeyRound, LogIn, LogOut, Store, UserRound } from "lucide-react";
import { canUseMemberFeatures, isAdmin } from "../utils/permissions";
import "./UserLayout.css";

export function UserHeader({ active, user, onLogout }) {
    const accountMenuRef = useRef(null);
    const accountPath = window.location.pathname;

    useEffect(() => {
        function closeOnOutside(event) {
            if (!accountMenuRef.current?.contains(event.target)) accountMenuRef.current?.removeAttribute("open");
        }
        function closeOnEscape(event) {
            if (event.key === "Escape") accountMenuRef.current?.removeAttribute("open");
        }
        document.addEventListener("pointerdown", closeOnOutside);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("pointerdown", closeOnOutside);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, []);

    return (
        <header className="user-header">
            <div className="user-header-inner">
                <a className="user-brand" href="/home">Quán Ngon</a>
                <nav className="user-nav" aria-label="Điều hướng chính">
                    <a className={active === "home" ? "is-active" : ""} href="/home" aria-current={active === "home" ? "page" : undefined}>TRANG CHỦ</a>
                    <a className={active === "explore" ? "is-active" : ""} href="/explore" aria-current={active === "explore" ? "page" : undefined}>KHÁM PHÁ</a>
                    <a className={active === "post" ? "is-active" : ""} href="/eateries/new" aria-current={active === "post" ? "page" : undefined}>ĐĂNG BÀI</a>
                    {isAdmin(user) && <a href="/admin/overview">QUẢN LÝ</a>}
                </nav>
                <div className="user-header-actions">
                    <details className="user-account-menu" ref={accountMenuRef}>
                        <summary className="user-icon-button" title="Tài khoản" aria-label="Tài khoản">
                            <CircleUserRound aria-hidden="true" />
                        </summary>
                        <div className="user-account-panel">
                            <strong>{user?.fullName || "Khách"}</strong>
                            <small>{user?.role === "ADMIN" ? "QUẢN TRỊ VIÊN" : user ? "THÀNH VIÊN" : "CHƯA ĐĂNG NHẬP"}</small>
                            {canUseMemberFeatures(user) && <><a href="/account" aria-current={accountPath === "/account" ? "page" : undefined}><UserRound aria-hidden="true" /> Quản lý tài khoản</a>
                            <a href="/account/password" aria-current={accountPath === "/account/password" ? "page" : undefined}><KeyRound aria-hidden="true" /> Đổi mật khẩu</a>
                            <a href="/account/eateries" aria-current={accountPath.startsWith("/account/eateries") ? "page" : undefined}><Store aria-hidden="true" /> Quản lý quán ăn đã chia sẻ</a>
                            <a href="/account/favorites" aria-current={accountPath === "/account/favorites" ? "page" : undefined}><Heart aria-hidden="true" /> Quán ăn yêu thích</a></>}
                            {user ? <button type="button" onClick={onLogout}><LogOut aria-hidden="true" /> Đăng xuất</button> : <a href="/login"><LogIn aria-hidden="true" /> Đăng nhập</a>}
                        </div>
                    </details>
                </div>
            </div>
        </header>
    );
}

export function UserFooter() {
    return (
        <footer className="user-footer">
            <strong>Quán Ngon</strong>
            <span>Nền tảng chia sẻ quán ăn ngon dành cho cộng đồng yêu ẩm thực.</span>
            <span>© {new Date().getFullYear()} Quán Ngon.</span>
        </footer>
    );
}

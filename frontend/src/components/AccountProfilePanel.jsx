import { useEffect, useId, useRef, useState } from "react";
import { CircleUserRound, LoaderCircle, Save } from "lucide-react";
import { updateUserInfo } from "../services/userService";

export function AccountProfilePanel({ user, onSaved }) {
    const [name, setName] = useState(user.fullName);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState({ message: "", field: false });
    const [busy, setBusy] = useState(false);
    const [loginRequired, setLoginRequired] = useState(false);
    const [uncertain, setUncertain] = useState(false);
    const submitting = useRef(false);
    const mounted = useRef(false);
    const id = useId();
    const disabled = busy || loginRequired || uncertain;

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    async function handleSave(event) {
        event.preventDefault();
        if (submitting.current || loginRequired || uncertain) return;
        setNotice("");
        const fullName = name.trim();
        if (!fullName) {
            setError({ message: "Họ và tên không được để trống.", field: true });
            event.currentTarget.elements.namedItem("fullName")?.focus();
            return;
        }

        submitting.current = true;
        setBusy(true);
        setError({ message: "", field: false });
        try {
            const updatedUser = await updateUserInfo(fullName);
            if (!mounted.current) return;
            setName(updatedUser.fullName);
            onSaved(updatedUser);
            setNotice("Cập nhật thông tin tài khoản thành công.");
        } catch (failure) {
            if (!mounted.current) return;
            const needsLogin = failure.status === 401;
            const resultUncertain = !failure.status || failure.status >= 500;
            setLoginRequired(needsLogin);
            setUncertain(resultUncertain);
            setError({
                message: needsLogin ? "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại."
                    : resultUncertain ? "Chưa xác nhận được kết quả cập nhật. Vui lòng tải lại thông tin để kiểm tra trước khi lưu lại."
                        : failure.message,
                field: !!failure.validationErrors?.fullName
            });
        } finally {
            submitting.current = false;
            if (mounted.current) setBusy(false);
        }
    }

    return <section className="account-panel account-profile-panel" aria-labelledby={`${id}-heading`}>
        <div className="account-panel-heading"><div><h2 id={`${id}-heading`}>Thông tin tài khoản</h2><p>Thông tin hiển thị trên Quán Ngon.</p></div></div>
        <div className="account-profile-top"><span className="account-avatar"><CircleUserRound aria-hidden="true" /></span><div><strong>{user.fullName}</strong><span>{user.email}</span></div></div>
        <form className="account-form" onSubmit={handleSave} noValidate aria-busy={busy}>
            <label htmlFor={`${id}-name`}><span>Họ và tên</span><input id={`${id}-name`} name="fullName" autoComplete="name" value={name} disabled={disabled} maxLength={100} required
                aria-invalid={error.field} aria-describedby={error.field ? `${id}-error` : undefined}
                onChange={(event) => { setName(event.target.value); setNotice(""); setError({ message: "", field: false }); }} /></label>
            <label><span>Email</span><input type="email" value={user.email} readOnly /></label>
            <label><span>Vai trò</span><input value={user.role === "ADMIN" ? "Quản trị viên" : "Thành viên"} readOnly /></label>
            {error.message && <p id={`${id}-error`} className="account-form-error" role="alert">{error.message}</p>}
            {notice && <p className="account-form-message" role="status">{notice}</p>}
            <div className="account-form-actions">
                {loginRequired ? <a className="account-outline" href="/login">Về trang đăng nhập</a>
                    : uncertain ? <a className="account-outline" href="/account">Tải lại thông tin</a>
                        : <button type="submit" className="account-primary" disabled={busy}>{busy ? <LoaderCircle className="account-profile-spinner" aria-hidden="true" /> : <Save aria-hidden="true" />}{busy ? "Đang lưu..." : "Lưu thay đổi"}</button>}
            </div>
        </form>
    </section>;
}

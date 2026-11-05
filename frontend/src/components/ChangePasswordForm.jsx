import { useEffect, useId, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, LoaderCircle } from "lucide-react";
import { changePassword } from "../services/authService";
import "./ChangePasswordForm.css";

const emptyForm = { currentPassword: "", newPassword: "", confirmPassword: "" };
const emptyError = { message: "", fields: {} };
const fields = [
    { name: "currentPassword", label: "Mật khẩu hiện tại", autoComplete: "current-password" },
    { name: "newPassword", label: "Mật khẩu mới", autoComplete: "new-password" },
    { name: "confirmPassword", label: "Xác nhận mật khẩu mới", autoComplete: "new-password" }
];

function validateForm(form) {
    const errors = {};
    for (const field of fields) {
        if (!form[field.name].trim()) errors[field.name] = `${field.label} không được để trống.`;
    }
    if (!errors.newPassword && (form.newPassword.length < 8 || form.newPassword.length > 64)) {
        errors.newPassword = "Mật khẩu mới cần từ 8 đến 64 ký tự.";
    }
    return errors;
}

export function ChangePasswordForm() {
    const [form, setForm] = useState(emptyForm);
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState(emptyError);
    const [busy, setBusy] = useState(false);
    const [loginRequired, setLoginRequired] = useState(false);
    const [success, setSuccess] = useState("");
    const submitting = useRef(false);
    const mounted = useRef(false);
    const id = useId();
    const disabled = busy || loginRequired || !!success;

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    async function submit(event) {
        event.preventDefault();
        if (submitting.current || loginRequired || success) return;
        const errors = validateForm(form);
        if (Object.keys(errors).length) {
            setError({ message: Object.values(errors)[0], fields: errors });
            event.currentTarget.elements.namedItem(Object.keys(errors)[0])?.focus();
            return;
        }

        submitting.current = true;
        setBusy(true);
        setError(emptyError);
        let result;
        try {
            result = await changePassword(form);
        } catch (failure) {
            if (!mounted.current) return;
            const uncertain = !failure.status || failure.status >= 500;
            const needsLogin = uncertain || failure.status === 401;
            setLoginRequired(needsLogin);
            setError({
                message: uncertain
                    ? "Chưa xác nhận được kết quả đổi mật khẩu. Vui lòng đăng nhập lại để kiểm tra trước khi gửi lại yêu cầu."
                    : failure.message,
                fields: failure.validationErrors && typeof failure.validationErrors === "object" ? failure.validationErrors : {}
            });
            if (needsLogin) setForm(emptyForm);
            submitting.current = false;
            setBusy(false);
            return;
        }

        if (!mounted.current) return;
        setForm(emptyForm);
        setVisible(false);
        setSuccess(result.message);
        try { sessionStorage.setItem("authNotice", result.message); }
        catch { /* Vẫn chuyển trang nếu trình duyệt không cho lưu thông báo. */ }
        window.location.replace("/login");
    }

    return <form className="change-password-form account-form account-password-form" onSubmit={submit} noValidate aria-busy={busy}>
        {fields.map(({ name, label, autoComplete }) => <label key={name} htmlFor={`${id}-${name}`}>
            <span>{label}</span>
            <input id={`${id}-${name}`} name={name} type={visible ? "text" : "password"} value={form[name]}
                autoComplete={autoComplete} required disabled={disabled} minLength={name === "newPassword" ? 8 : undefined}
                aria-invalid={!!error.fields[name]} aria-describedby={error.fields[name] ? `${id}-error` : undefined}
                onChange={(event) => { setForm((current) => ({ ...current, [name]: event.target.value })); setError(emptyError); }} />
        </label>)}
        <button type="button" className="account-inline-toggle" disabled={disabled} aria-pressed={visible} onClick={() => setVisible((current) => !current)}>
            {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}{visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        </button>
        {error.message && <p id={`${id}-error`} className="account-form-error" role="alert">{error.message}</p>}
        {success && <p className="account-form-message" role="status">{success}</p>}
        {loginRequired || success ? <a className="change-password-login account-outline" href="/login">Về trang đăng nhập</a> : <div className="account-form-actions">
            <button type="submit" className="account-primary" disabled={disabled}>
                {busy ? <LoaderCircle className="change-password-spinner" aria-hidden="true" /> : <KeyRound aria-hidden="true" />}{busy ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
            </button>
        </div>}
    </form>;
}

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { forgotPassword, getPasswordResetOtpStatus, resetPassword } from "../services/authService";
import { getApiErrorMessage } from "../services/apiClient";
import { finishPasswordRecovery, readPasswordRecovery, savePasswordRecovery } from "../utils/passwordRecovery";
import "./PasswordRecovery.css";

const emptyError = { message: "", fields: {} };

function PasswordRecovery({ reset = false }) {
    const [saved] = useState(readPasswordRecovery);
    const [form, setForm] = useState(() => ({ email: saved.email, otp: "", newPassword: "", confirmPassword: "" }));
    const [expiresAt, setExpiresAt] = useState(reset ? saved.expiresAt : 0);
    const [resendAt, setResendAt] = useState(reset ? saved.resendAt : 0);
    const [now, setNow] = useState(() => Date.now());
    const [busy, setBusy] = useState(false);
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState(emptyError);
    const [notice, setNotice] = useState("");
    const [checkedEmail, setCheckedEmail] = useState("");
    const submitting = useRef(false);
    const mounted = useRef(false);
    const id = useId();
    const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
    const resendSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
    const expired = reset && expiresAt > 0 && secondsLeft === 0;
    const statusChecked = checkedEmail !== "" && checkedEmail === form.email.trim();
    const canContinue = !reset && statusChecked && secondsLeft > 0;
    const remainingTime = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

    useEffect(() => {
        mounted.current = true;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => { mounted.current = false; window.clearInterval(timer); };
    }, []);

    function update(name, value) {
        setForm((current) => ({ ...current, [name]: value }));
        setError(emptyError);
        setNotice("");
        if (name === "email") {
            setCheckedEmail("");
            setExpiresAt(0);
            setResendAt(0);
        }
    }

    function validate(includePasswords) {
        const fields = {};
        if (!form.email.trim()) fields.email = "Email không được để trống.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) fields.email = "Email không hợp lệ.";
        if (includePasswords) {
            if (!/^\d{6}$/.test(form.otp)) fields.otp = "OTP phải gồm 6 chữ số.";
            if (!form.newPassword.trim()) fields.newPassword = "Mật khẩu mới không được để trống.";
            else if (form.newPassword.length < 8 || form.newPassword.length > 64) fields.newPassword = "Mật khẩu mới phải từ 8 đến 64 ký tự.";
            if (!form.confirmPassword.trim()) fields.confirmPassword = "Xác nhận mật khẩu không được để trống.";
            else if (form.newPassword !== form.confirmPassword) fields.confirmPassword = "Xác nhận mật khẩu mới không khớp.";
        }
        if (Object.keys(fields).length) {
            setError({ message: Object.values(fields)[0], fields });
            document.getElementById(`${id}-${Object.keys(fields)[0]}`)?.focus();
            return false;
        }
        return true;
    }

    function handleFailure(failure, resetting) {
        if (!mounted.current) return;
        if (failure.status === 429 && !resetting) {
            const state = savePasswordRecovery(
                form.email.trim(), Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)),
                failure.retryAfterSeconds || 60);
            setResendAt(state.resendAt);
            setNow(Date.now());
        }
        setError({
            message: getApiErrorMessage(failure, resetting
                ? "Chưa xác nhận được kết quả đặt lại mật khẩu. Hãy đăng nhập để kiểm tra hoặc yêu cầu mã mới."
                : "Chưa thể yêu cầu gửi mã. Vui lòng thử lại sau."),
            fields: failure.validationErrors && typeof failure.validationErrors === "object" ? failure.validationErrors : {}
        });
    }

    function applyOtpStatus(email, status) {
        const state = savePasswordRecovery(email, status.expiresIn, status.resendAfterSeconds);
        setExpiresAt(state.expiresAt);
        setResendAt(state.resendAt);
        setCheckedEmail(email);
        setNow(Date.now());
    }

    async function requestNewCode(email) {
        const result = await forgotPassword(email);
        if (!mounted.current) return;
        const state = savePasswordRecovery(result.email, result.expiresIn);
        if (reset) {
            setExpiresAt(state.expiresAt);
            setResendAt(state.resendAt);
            setNow(Date.now());
            setForm((current) => ({ ...current, email: result.email, otp: "" }));
            setNotice(`${result.message} Khi nhận được email, hãy sử dụng mã mới nhất.`);
            document.getElementById(`${id}-otp`)?.focus();
        } else {
            window.location.assign("/reset-password");
        }
    }

    async function checkOtpStatus() {
        if (submitting.current || !validate(false)) return;
        submitting.current = true;
        setBusy(true);
        setError(emptyError);
        setNotice("");
        try {
            const email = form.email.trim();
            const status = await getPasswordResetOtpStatus(email);
            if (!mounted.current) return;
            applyOtpStatus(email, status);
            if (!status.otpActive && status.resendAfterSeconds === 0) {
                await requestNewCode(email);
            }
        } catch (failure) {
            handleFailure(failure, false);
        } finally {
            submitting.current = false;
            if (mounted.current) setBusy(false);
        }
    }

    async function sendCode() {
        if (submitting.current || resendSeconds > 0 || !validate(false)) return;
        submitting.current = true;
        setBusy(true);
        setError(emptyError);
        setNotice("");
        try {
            await requestNewCode(form.email.trim());
        } catch (failure) {
            handleFailure(failure, false);
        } finally {
            submitting.current = false;
            if (mounted.current) setBusy(false);
        }
    }

    async function submit(event) {
        event.preventDefault();
        if (!reset) {
            if (submitting.current) return;
            if (canContinue) window.location.assign("/reset-password");
            else await checkOtpStatus();
            return;
        }
        if (submitting.current || expired || !validate(true)) return;
        submitting.current = true;
        setBusy(true);
        setError(emptyError);
        setNotice("");
        try {
            const result = await resetPassword({ ...form, email: form.email.trim() });
            if (!mounted.current) return;
            finishPasswordRecovery(form.email.trim(), result.message);
            window.location.replace("/login");
        } catch (failure) {
            handleFailure(failure, true);
        } finally {
            submitting.current = false;
            if (mounted.current) setBusy(false);
        }
    }

    return <main className="password-recovery">
        <section className="password-recovery-card" aria-labelledby={`${id}-title`}>
            <a href="/home" className="password-recovery-brand">Quán Ngon</a>
            <div className="password-recovery-content">
                <h1 id={`${id}-title`}>{reset ? "Đặt lại mật khẩu" : "Quên mật khẩu"}</h1>
                <p className="password-recovery-description">{reset
                    ? "Nhập mã OTP từ email và đặt mật khẩu mới cho tài khoản."
                    : "Nhập email đã đăng ký để nhận mã OTP đặt lại mật khẩu."}</p>
                <form onSubmit={submit} noValidate aria-busy={busy}>
                    <label htmlFor={`${id}-email`}>Email</label>
                    <input id={`${id}-email`} name="email" type="email" value={form.email} autoComplete="email" required disabled={busy}
                        readOnly={reset && !!saved.email} placeholder="Nhập email của bạn" aria-invalid={!!error.fields.email}
                        aria-describedby={error.fields.email ? `${id}-error` : undefined} onChange={(event) => update("email", event.target.value)} />
                    {!reset && statusChecked && <div className="password-recovery-otp-status" role="status">
                        <p className="password-recovery-otp-status-title">{secondsLeft > 0
                            ? <>Mã OTP đã gửi còn hiệu lực <span role="timer" aria-live="off">{remainingTime}</span></>
                            : expiresAt > 0 ? "Mã OTP trước đó đã hết hạn." : "Chưa có mã OTP còn hiệu lực."}</p>
                        <p>{secondsLeft > 0
                            ? "Kiểm tra hộp thư hoặc thư rác để lấy mã."
                            : resendSeconds > 0 ? "Bạn có thể yêu cầu mã mới khi hết thời gian chờ." : "Vui lòng yêu cầu mã mới để tiếp tục."}</p>
                    </div>}
                    {reset && <>
                        <label className="password-recovery-otp-label" htmlFor={`${id}-otp`}>Mã OTP{expiresAt > 0 && <span className={`password-recovery-timer${expired ? " is-expired" : ""}`} role="timer" aria-live="off">{expired
                            ? " (Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.)"
                            : ` (Mã có hiệu lực còn ${remainingTime})`}</span>}</label>
                        <input id={`${id}-otp`} className="password-recovery-otp" name="otp" type="text" value={form.otp}
                            inputMode="numeric" autoComplete="one-time-code" maxLength={6} required disabled={busy}
                            placeholder="Nhập 6 chữ số" aria-invalid={!!error.fields.otp} aria-describedby={error.fields.otp ? `${id}-error` : undefined}
                            onChange={(event) => update("otp", event.target.value.replace(/\D/g, "").slice(0, 6))} />
                        {[{ name: "newPassword", label: "Mật khẩu mới" }, { name: "confirmPassword", label: "Xác nhận mật khẩu mới" }].map((field) => <div key={field.name} className="password-recovery-password-field">
                            <label htmlFor={`${id}-${field.name}`}>{field.label}</label>
                            <input id={`${id}-${field.name}`} name={field.name} type={visible ? "text" : "password"} value={form[field.name]}
                                autoComplete="new-password" minLength={8} maxLength={64} required disabled={busy} placeholder={field.name === "newPassword" ? "Từ 8 đến 64 ký tự" : "Nhập lại mật khẩu mới"}
                                aria-invalid={!!error.fields[field.name]} aria-describedby={error.fields[field.name] ? `${id}-error` : undefined}
                                onChange={(event) => update(field.name, event.target.value)} />
                        </div>)}
                        <button type="button" className="password-recovery-toggle" disabled={busy} aria-pressed={visible} onClick={() => setVisible((current) => !current)}>
                            {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}{visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        </button>
                    </>}
                    {error.message && <p id={`${id}-error`} className="password-recovery-error" role="alert">{error.message}</p>}
                    {notice && <p className="password-recovery-notice" role="status">{notice}</p>}
                    <button className="password-recovery-submit" type="submit" disabled={busy || expired || (!reset && !canContinue && resendSeconds > 0)}>
                        {busy && <LoaderCircle className="password-recovery-spinner" aria-hidden="true" />}
                        {busy ? "Đang xử lý..." : reset ? "Đặt lại mật khẩu" : canContinue ? "Tiếp tục nhập OTP"
                            : resendSeconds > 0 ? `Gửi lại sau ${resendSeconds}s` : statusChecked ? "Gửi mã OTP mới" : "Tiếp tục"}
                    </button>
                </form>
                {(reset || canContinue) && <button type="button" className="password-recovery-resend" onClick={sendCode} disabled={busy || resendSeconds > 0}>
                    {resendSeconds > 0 ? `Gửi lại sau ${resendSeconds}s` : "Gửi mã OTP mới"}
                </button>}
                {reset && <p className="password-recovery-hint">Chưa nhận được mã? Kiểm tra thư rác hoặc yêu cầu gửi lại.</p>}
                <a className="password-recovery-back" href="/login"><ArrowLeft aria-hidden="true" />Quay lại trang đăng nhập</a>
            </div>
        </section>
    </main>;
}

export default PasswordRecovery;

import { getApiErrorMessage } from "../services/apiClient";
import { useEffect, useState } from "react";
import { loadCurrentUser, login, logout, register, resendOtp } from "../services/authService";
import { Eye, EyeOff, Mail, UserRound } from "lucide-react";
import { canUseMemberFeatures } from "../utils/permissions";
import "./Login.css";

function PasswordField({ value, onChange, placeholder, autoComplete, minLength, maxLength }) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="input-box">
            <input
                type={visible ? "text" : "password"}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                aria-label={placeholder}
                autoComplete={autoComplete}
                minLength={minLength}
                maxLength={maxLength}
                required
            />
            <button
                type="button"
                className="password-toggle"
                title={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setVisible(!visible)}
            >
                {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
        </div>
    );
}

function Login() {
    const [view, setView] = useState("checking");
    const [loginEmail, setLoginEmail] = useState(
        () => sessionStorage.getItem("authPrefillEmail") || ""
    );
    const [password, setPassword] = useState("");
    const [form, setForm] = useState({
        fullName: "", email: "", password: "", confirmPassword: ""
    });
    const [error, setError] = useState("");
    const [message, setMessage] = useState(() => {
        const notice = sessionStorage.getItem("authNotice") || "";
        sessionStorage.removeItem("authNotice");
        sessionStorage.removeItem("authPrefillEmail");
        return notice;
    });
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let active = true;

        loadCurrentUser()
            .then(async (currentUser) => {
                if (!active) return;
                if (canUseMemberFeatures(currentUser)) {
                    window.location.replace("/home");
                    return;
                }
                await logout().catch(() => {});
                setError("Vai trò tài khoản chưa được hỗ trợ.");
                setView("login");
            })
            .catch(() => {
                if (!active) return;
                window.history.replaceState(null, "", "/login");
                setView("login");
            });

        return () => { active = false; };
    }, []);

    function openView(next) {
        setError("");
        setMessage("");
        setView(next);
    }

    function openVerifyPage(email, expiresIn) {
        sessionStorage.setItem("pendingOtpEmail", email);

        if (expiresIn) {
            sessionStorage.setItem(
                "pendingOtpExpiresAt",
                String(Date.now() + expiresIn * 1000)
            );
        } else {
            sessionStorage.removeItem("pendingOtpExpiresAt");
        }

        window.location.assign("/verify-otp");
    }

    async function handleLogin(event) {
        event.preventDefault();
        setBusy(true);
        setError("");
        setMessage("");

        const email = loginEmail.trim();

        try {
            const currentUser = await login(email, password);
            if (canUseMemberFeatures(currentUser)) {
                window.location.assign("/home");
                return;
            }
            await logout().catch(() => {});
            setError("Vai trò tài khoản chưa được hỗ trợ.");
        } catch (err) {
            if (err.code === "EMAIL_NOT_VERIFIED") {
                try {
                    const result = await resendOtp(email);
                    openVerifyPage(result.email, result.expiresIn);
                } catch (resendError) {
                    setError(getApiErrorMessage(resendError, "Không gửi được mã xác thực. Vui lòng thử lại."));
                }
            } else {
                setError(getApiErrorMessage(err));
            }
        } finally {
            setBusy(false);
        }
    }

    async function handleRegister(event) {
        event.preventDefault();
        setError("");
        setMessage("");

        if (form.password !== form.confirmPassword) {
            setError("Mật khẩu nhập lại không khớp.");
            return;
        }

        setBusy(true);
        try {
            const result = await register({
                fullName: form.fullName.trim(),
                email: form.email.trim(),
                password: form.password,
                confirmPassword: form.confirmPassword
            });
            openVerifyPage(result.email, result.expiresIn);
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setBusy(false);
        }
    }

    if (view === "checking") {
        return <main className="auth-dashboard">Đang kiểm tra phiên đăng nhập...</main>;
    }

    return (
        <main className={`container auth-container ${view !== "login" ? "active" : ""}`}>
            <header className="auth-mobile-header">
                <a className="auth-mobile-brand" href="/home">Quán Ngon</a>
                <div className="auth-mobile-switch" role="group" aria-label="Đăng nhập hoặc đăng ký">
                    <button
                        type="button"
                        aria-pressed={view === "login"}
                        onClick={() => openView("login")}
                        disabled={busy}
                    >
                        Đăng nhập
                    </button>
                    <button
                        type="button"
                        aria-pressed={view === "register"}
                        onClick={() => openView("register")}
                        disabled={busy}
                    >
                        Đăng ký
                    </button>
                </div>
            </header>

            <section className="form-box login">
                <form onSubmit={handleLogin}>
                    <h1>Đăng nhập</h1>

                    {view === "login" && message && (
                        <p className="success-message is-visible" role="status">{message}</p>
                    )}
                    {view === "login" && error && (
                        <p className="error-msg is-visible" role="alert">{error}</p>
                    )}

                    <div className="input-box">
                        <input
                            type="email"
                            value={loginEmail}
                            onChange={(event) => setLoginEmail(event.target.value)}
                            placeholder="Email"
                            aria-label="Email"
                            autoComplete="email"
                            required
                        />
                        <Mail aria-hidden="true" />
                    </div>

                    <PasswordField
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Mật khẩu"
                        autoComplete="current-password"
                    />

                    <a className="auth-forgot-password" href="/forgot-password">Quên mật khẩu?</a>

                    <button type="submit" className="btn" disabled={busy}>
                        {busy ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>
                </form>
            </section>

            <section className="form-box register">
                <form onSubmit={handleRegister}>
                    <h1>Đăng ký</h1>

                    {error && <p className="error-msg is-visible" role="alert">{error}</p>}

                    <div className="input-box">
                        <input
                            type="text"
                            value={form.fullName}
                            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                            placeholder="Họ và tên"
                            aria-label="Họ và tên"
                            autoComplete="name"
                            required
                        />
                        <UserRound aria-hidden="true" />
                    </div>

                    <div className="input-box">
                        <input
                            type="email"
                            value={form.email}
                            onChange={(event) => setForm({ ...form, email: event.target.value })}
                            placeholder="Email"
                            aria-label="Email"
                            autoComplete="email"
                            required
                        />
                        <Mail aria-hidden="true" />
                    </div>

                    <PasswordField
                        value={form.password}
                        onChange={(event) => setForm({ ...form, password: event.target.value })}
                        placeholder="Mật khẩu"
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={64}
                    />

                    <PasswordField
                        value={form.confirmPassword}
                        onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                        placeholder="Nhập lại mật khẩu"
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={64}
                    />

                    <button type="submit" className="btn" disabled={busy}>
                        {busy ? "Đang đăng ký..." : "Đăng ký"}
                    </button>
                </form>
            </section>

            <div className="toggle-box">
                <div className="toggle-panel toggle-left">
                    <h1>Quán Ngon</h1>
                    <p>Chưa có tài khoản?</p>
                    <button
                        type="button"
                        className="btn"
                        onClick={() => openView("register")}
                        disabled={busy}
                    >
                        Đăng ký
                    </button>
                </div>

                <div className="toggle-panel toggle-right">
                    <h1>Quán Ngon</h1>
                    <p>Quay lại đăng nhập</p>
                    <button
                        type="button"
                        className="btn"
                        onClick={() => openView("login")}
                        disabled={busy}
                    >
                        Đăng nhập
                    </button>
                </div>
            </div>
        </main>
    );
}

export default Login;

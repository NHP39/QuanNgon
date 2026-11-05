import { getApiErrorMessage } from "../services/apiClient";
import { useEffect, useRef, useState } from "react";
import { resendOtp, verifyOtp } from "../services/authService";
import { ArrowLeft } from "lucide-react";
import "./VerifyOtp.css";

function VerifyOtp() {
    const email = sessionStorage.getItem("pendingOtpEmail") || "";
    const inputs = useRef([]);
    const [digits, setDigits] = useState(Array(6).fill(""));
    const [expiresAt, setExpiresAt] = useState(
        Number(sessionStorage.getItem("pendingOtpExpiresAt")) || 0
    );
    const [now, setNow] = useState(() => Date.now());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!email) {
            window.location.replace("/login");
            return;
        }

        inputs.current[0]?.focus();
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [email]);

    if (!email) return null;

    const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
    const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const seconds = String(secondsLeft % 60).padStart(2, "0");

    function fillDigits(start, text) {
        const numbers = text.replace(/\D/g, "").slice(0, 6 - start);
        if (!numbers) return;

        setDigits((current) => {
            const next = [...current];
            [...numbers].forEach((number, offset) => {
                next[start + offset] = number;
            });
            return next;
        });

        inputs.current[Math.min(start + numbers.length, 5)]?.focus();
    }

    function handleKeyDown(event, index) {
        if (event.key === "Backspace" && !digits[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
        if (event.key === "ArrowLeft" && index > 0) {
            inputs.current[index - 1]?.focus();
        }
        if (event.key === "ArrowRight" && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    }

    async function handleVerify(event) {
        event.preventDefault();
        setBusy(true);
        setError("");
        setMessage("");

        try {
            await verifyOtp(email, digits.join(""));
            sessionStorage.setItem("authPrefillEmail", email);
            sessionStorage.setItem(
                "authNotice",
                "Email đã được xác thực. Bạn có thể đăng nhập."
            );
            sessionStorage.removeItem("pendingOtpEmail");
            sessionStorage.removeItem("pendingOtpExpiresAt");
            window.location.replace("/login");
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setBusy(false);
        }
    }

    async function handleResend() {
        if (busy || Date.now() < expiresAt) return;

        setBusy(true);
        setError("");
        setMessage("");

        try {
            const result = await resendOtp(email);
            const deadline = Date.now() + result.expiresIn * 1000;
            sessionStorage.setItem("pendingOtpExpiresAt", String(deadline));
            setExpiresAt(deadline);
            setNow(Date.now());
            setDigits(Array(6).fill(""));
            inputs.current[0]?.focus();
            setMessage("Mã mới đã được gửi đến email của bạn.");
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="verify-page">
            <section className="verify-card">
                <button
                    type="button"
                    className="verify-back"
                    title="Quay lại đăng nhập"
                    aria-label="Quay lại đăng nhập"
                    onClick={() => window.location.assign("/login")}
                >
                    <ArrowLeft aria-hidden="true" />
                </button>

                <div className="verify-content">
                    <h1>Xác thực tài khoản</h1>
                    <p className="verify-subtitle">
                        OTP đã được gửi đến email
                    </p>

                    <form onSubmit={handleVerify}>
                        <div className="verify-digits" aria-label="Mã OTP gồm 6 chữ số">
                            {digits.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(element) => { inputs.current[index] = element; }}
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete={index === 0 ? "one-time-code" : "off"}
                                    aria-label={`Chữ số OTP thứ ${index + 1}`}
                                    value={digit}
                                    onFocus={(event) => event.target.select()}
                                    onChange={(event) => {
                                        const value = event.target.value.replace(/\D/g, "");
                                        if (!value) {
                                            setDigits((current) => {
                                                const next = [...current];
                                                next[index] = "";
                                                return next;
                                            });
                                        } else {
                                            fillDigits(index, value);
                                        }
                                    }}
                                    onPaste={(event) => {
                                        event.preventDefault();
                                        fillDigits(index, event.clipboardData.getData("text"));
                                    }}
                                    onKeyDown={(event) => handleKeyDown(event, index)}
                                />
                            ))}
                        </div>

                        <p className="verify-timer" role="timer">
                            {minutes}:{seconds}
                        </p>

                        {error && <p className="verify-error" role="alert">{error}</p>}
                        {message && <p className="verify-success" role="status">{message}</p>}

                        <button
                            type="submit"
                            className="verify-submit"
                            disabled={busy || digits.some((digit) => !digit)}
                        >
                            {busy ? "Đang xử lý..." : "Xác nhận"}
                        </button>
                    </form>

                    <button
                        type="button"
                        className="verify-resend"
                        onClick={handleResend}
                        disabled={busy || secondsLeft > 0}
                    >
                        Gửi lại mã OTP
                    </button>
                </div>
            </section>
        </main>
    );
}

export default VerifyOtp;

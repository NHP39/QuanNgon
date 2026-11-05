import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Trash2, X } from "lucide-react";
import { deleteCurrentUserReview } from "../services/reviewService";
import "./ReviewForm.css";

export function DeleteReviewDialog({ eatery, onClose, onDeleted, onRefreshReview, onRetrySession }) {
    const dialog = useRef(null);
    const cancelButton = useRef(null);
    const mounted = useRef(false);
    const submitting = useRef(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        mounted.current = true;
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        const element = dialog.current;
        element.showModal();
        document.body.style.overflow = "hidden";
        cancelButton.current?.focus();
        return () => {
            mounted.current = false;
            element.close();
            document.body.style.overflow = previousOverflow;
            if (previousFocus?.isConnected && !previousFocus.disabled) previousFocus.focus?.();
        };
    }, []);

    function close() {
        if (!submitting.current) onClose();
    }

    async function handleDelete(event) {
        event.preventDefault();
        if (submitting.current) return;
        submitting.current = true;
        setBusy(true);
        setError(null);
        try {
            await deleteCurrentUserReview(eatery.id);
            if (mounted.current) onDeleted();
        } catch (failure) {
            if (mounted.current) setError(failure);
        } finally {
            submitting.current = false;
            if (mounted.current) setBusy(false);
        }
    }

    const sessionExpired = error?.status === 401 || error?.sessionChanged;
    const unavailable = error?.status === 404;

    return <dialog ref={dialog} className="review-compose review-delete" aria-labelledby="review-delete-title" aria-describedby="review-delete-description" onCancel={(event) => { event.preventDefault(); close(); }}>
        <div className="review-compose-heading"><h2 id="review-delete-title">Xóa đánh giá?</h2><button type="button" className="review-compose-close" aria-label="Đóng xác nhận xóa đánh giá" disabled={busy} onClick={close}><X aria-hidden="true" /></button></div>
        <p id="review-delete-description" className="review-delete-description">Bạn muốn xóa đánh giá của mình về <strong>{eatery.name}</strong>? Nội dung và ảnh trong đánh giá sẽ bị xóa. Sau đó bạn có thể viết đánh giá mới.</p>
        {error && <div className="review-compose-error" role="alert"><p>{error.message || "Không xóa được đánh giá. Vui lòng thử lại."}</p>
            {sessionExpired ? <><button type="button" onClick={onRetrySession}>Kiểm tra lại phiên</button><a href="/login">Đăng nhập</a></> : error.status !== 403 && <button type="button" onClick={onRefreshReview}>Tải lại đánh giá của tôi</button>}
            {unavailable && <a href="/explore">Quay lại Khám phá</a>}
        </div>}
        <form onSubmit={handleDelete} aria-busy={busy}>
            <div className="review-compose-actions"><button ref={cancelButton} type="button" disabled={busy} onClick={close}>Hủy</button><button type="submit" className="detail-write-button review-delete-confirm" disabled={busy || sessionExpired || error?.status === 403 || unavailable}>{busy ? <LoaderCircle aria-hidden="true" /> : <Trash2 aria-hidden="true" />}{busy ? "Đang xóa..." : "Xóa đánh giá"}</button></div>
        </form>
    </dialog>;
}

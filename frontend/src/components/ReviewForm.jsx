import { useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, Save, Send, Star, X } from "lucide-react";
import { createReview, updateCurrentUserReview } from "../services/reviewService";
import { getImageError, prepareEateryImage, readImageDataUrl } from "../utils/eateryImages";
import { EateryPhoto } from "./EateryPhotoGallery";
import "./ReviewForm.css";

const criteria = [
    { key: "foodQuantity", label: "Chất lượng món ăn" },
    { key: "serviceQuantity", label: "Dịch vụ phục vụ" },
    { key: "space", label: "Không gian quán" },
    { key: "cleanliness", label: "Vệ sinh" }
];

export function ReviewForm({ eatery, user, initialReview = null, onClose, onSaved, onRefreshReview, onRetrySession }) {
    const editing = !!initialReview;
    const dialog = useRef(null);
    const mounted = useRef(false);
    const submitting = useRef(false);
    const preparing = useRef(false);
    const [scores, setScores] = useState(() => Object.fromEntries(criteria.map(({ key }) => [key, initialReview?.[key] ?? 0])));
    const [content, setContent] = useState(initialReview?.content ?? "");
    const [images, setImages] = useState(() => (initialReview?.images ?? []).map((image) => ({ key: `existing-${image.id}`, existingId: image.id, preview: image.imageUrl })));
    const [processing, setProcessing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [imageError, setImageError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        mounted.current = true;
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        const element = dialog.current;
        element.showModal();
        document.body.style.overflow = "hidden";
        element.querySelector("h2")?.focus();
        return () => {
            mounted.current = false;
            element.close();
            document.body.style.overflow = previousOverflow;
            if (previousFocus?.isConnected && !previousFocus.disabled) previousFocus.focus?.();
        };
    }, []);

    async function chooseImages(event) {
        const files = [...event.target.files];
        event.target.value = "";
        if (!files.length || preparing.current || submitting.current) return;
        setImageError("");
        if (images.length + files.length > 4) {
            setImageError("Đánh giá chỉ được tối đa 4 ảnh.");
            return;
        }
        const problem = files.map(getImageError).find(Boolean);
        if (problem) { setImageError(problem); return; }
        preparing.current = true;
        setProcessing(true);
        try {
            const additions = [];
            for (const file of files) {
                const prepared = await prepareEateryImage(file);
                const preview = await readImageDataUrl(prepared);
                if (!mounted.current) return;
                additions.push({ key: crypto.randomUUID(), file: prepared, preview });
            }
            if (mounted.current) setImages((current) => [...current, ...additions]);
        } catch (failure) {
            if (mounted.current) setImageError(failure.message || "Không xử lý được ảnh. Vui lòng chọn lại.");
        } finally {
            preparing.current = false;
            if (mounted.current) setProcessing(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (submitting.current || preparing.current) return;
        const errors = {};
        for (const criterion of criteria) {
            if (!Number.isInteger(scores[criterion.key]) || scores[criterion.key] < 1 || scores[criterion.key] > 5) {
                errors[criterion.key] = `Vui lòng chọn điểm ${criterion.label.toLowerCase()}.`;
            }
        }
        const text = content.trim();
        if (text.length < 10 || text.length > 1000) errors.content = "Nhận xét phải từ 10 đến 1000 ký tự sau khi bỏ khoảng trắng hai đầu.";
        setFieldErrors(errors);
        setError(null);
        if (Object.keys(errors).length) {
            dialog.current.querySelector(`[name="${Object.keys(errors)[0]}"]`)?.focus();
            return;
        }
        submitting.current = true;
        setBusy(true);
        try {
            const data = { ...scores, content: text };
            const newImages = images.filter((image) => image.file).map((image) => image.file);
            let review;
            if (editing) {
                const keptImageIds = new Set(images.map((image) => image.existingId).filter(Boolean));
                data.removeImageIds = initialReview.images.filter((image) => !keptImageIds.has(image.id)).map((image) => image.id);
                review = await updateCurrentUserReview(eatery.id, data, newImages);
            } else {
                review = await createReview(eatery.id, data, newImages);
            }
            if (!mounted.current) return;
            if (review.author.userId !== user.userId || (editing && review.id !== initialReview.id)) {
                const failure = new Error("Phiên đăng nhập đã thay đổi. Vui lòng kiểm tra lại phiên.");
                failure.sessionChanged = true;
                throw failure;
            }
            onSaved(review);
        } catch (failure) {
            if (!mounted.current) return;
            setError(failure);
            setFieldErrors(failure.validationErrors || {});
        } finally {
            submitting.current = false;
            if (mounted.current) setBusy(false);
        }
    }

    const sessionExpired = error?.status === 401 || error?.sessionChanged;
    const unavailable = error?.status === 404;
    const alreadyReviewed = error?.status === 409;
    const cannotSubmit = busy || processing || sessionExpired || error?.status === 403 || unavailable || alreadyReviewed;

    return <dialog ref={dialog} className="review-compose" aria-labelledby="review-compose-title" onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        if (!submitting.current) onClose();
    }}>
        <div className="review-compose-heading"><div><h2 id="review-compose-title" tabIndex={-1}>{editing ? "Chỉnh sửa đánh giá" : "Viết đánh giá"}</h2><p>{eatery.name}</p></div><button type="button" className="review-compose-close" aria-label="Đóng form đánh giá" disabled={busy} onClick={onClose}><X aria-hidden="true" /></button></div>
        <form onSubmit={handleSubmit} noValidate aria-busy={busy || processing}>
            <fieldset className="review-compose-fields" disabled={busy || processing}>
                <legend className="review-compose-sr">Nội dung đánh giá</legend>
                <p className="review-compose-hint">Chọn từ 1 đến 5 sao cho từng tiêu chí.</p>
                <div className="review-compose-criteria">{criteria.map(({ key, label }) => <fieldset key={key} className="review-compose-score" aria-describedby={fieldErrors[key] ? `review-error-${key}` : undefined}>
                    <legend>{label}</legend><div>{[1, 2, 3, 4, 5].map((value) => <label key={value} className={value <= scores[key] ? "is-selected" : ""}>
                        <input type="radio" name={key} value={value} checked={scores[key] === value} aria-label={`${label}: ${value} sao`} aria-invalid={!!fieldErrors[key]} onChange={() => {
                            setScores((current) => ({ ...current, [key]: value }));
                            setFieldErrors((current) => ({ ...current, [key]: "" }));
                        }} /><Star aria-hidden="true" />
                    </label>)}<span>{scores[key] ? `${scores[key]}/5` : "Chưa chọn"}</span></div>
                    {fieldErrors[key] && <p id={`review-error-${key}`} className="review-compose-field-error" role="alert">{fieldErrors[key]}</p>}
                </fieldset>)}</div>
                <label className="review-compose-content" htmlFor="review-content">Nhận xét <span>(bắt buộc)</span></label>
                <textarea id="review-content" name="content" rows={4} maxLength={1000} value={content} placeholder="Chia sẻ trải nghiệm của bạn về món ăn, phục vụ, không gian..." aria-invalid={!!fieldErrors.content} aria-describedby="review-content-help review-content-error" onChange={(event) => {
                    setContent(event.target.value);
                    setFieldErrors((current) => ({ ...current, content: "" }));
                }} />
                <p id="review-content-help" className="review-compose-counter">Từ 10 đến 1000 ký tự <span>{content.trim().length}/1000</span></p>
                <p id="review-content-error" className="review-compose-field-error" role={fieldErrors.content ? "alert" : undefined}>{fieldErrors.content || ""}</p>
                <div className="review-compose-image-heading"><span>Ảnh trải nghiệm <small>(không bắt buộc)</small></span><span>{images.length}/4 ảnh</span></div>
                <div className="review-compose-images">{images.map((image, index) => <div key={image.key}><EateryPhoto image={{ imageUrl: image.preview }} name="Đánh giá" index={index} lazy={false} /><button type="button" aria-label={`Xóa ảnh đánh giá ${index + 1}`} onClick={() => { setImages((current) => current.filter((item) => item.key !== image.key)); setImageError(""); }}><X aria-hidden="true" /></button></div>)}
                    {images.length < 4 && <label className="review-compose-add"><Camera aria-hidden="true" /><span>Thêm ảnh</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseImages} aria-label="Thêm ảnh đánh giá" /></label>}
                </div>
                <p className="review-compose-hint">Tối đa 4 ảnh JPG, PNG hoặc WEBP, mỗi ảnh tối đa 2 MB.</p>
            </fieldset>
            {processing && <p className="review-compose-progress" role="status"><LoaderCircle aria-hidden="true" />Đang xử lý ảnh...</p>}
            {imageError && <p className="review-compose-field-error" role="alert">{imageError}</p>}
            {error && <div className="review-compose-error" role="alert"><p>{error.message || "Không lưu được đánh giá. Vui lòng thử lại."}</p>
                {(alreadyReviewed || (editing && unavailable)) && <button type="button" onClick={onRefreshReview}>Tải lại đánh giá của tôi</button>}
                {sessionExpired && <><button type="button" onClick={onRetrySession}>Kiểm tra lại phiên</button><a href="/login">Đăng nhập</a></>}
                {unavailable && <a href="/explore">Quay lại Khám phá</a>}
            </div>}
            <div className="review-compose-actions"><button type="button" disabled={busy} onClick={onClose}>Hủy</button><button type="submit" className="detail-write-button" disabled={cannotSubmit}>{busy ? <LoaderCircle aria-hidden="true" /> : editing ? <Save aria-hidden="true" /> : <Send aria-hidden="true" />}{busy ? (editing ? "Đang lưu..." : "Đang gửi...") : editing ? "Lưu thay đổi" : "Gửi đánh giá"}</button></div>
        </form>
    </dialog>;
}

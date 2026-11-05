import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, CircleUserRound, Eye, LoaderCircle, MapPin, Phone, RefreshCw, Store, X } from "lucide-react";
import { formatAdminDate } from "../../data/adminFormat";
import { ADMIN_EATERY_TABS } from "../../data/adminEateryConfig";
const ACTION_LABELS = { approve: "Duyệt quán ăn", reject: "Từ chối quán ăn" };

function statusLabel(status) {
    return ADMIN_EATERY_TABS.find((tab) => tab.status === status)?.label || status;
}

function addressOf(eatery) {
    return [eatery.street, eatery.ward, eatery.province].filter(Boolean).join(", ");
}

function photosOf(eatery) {
    return [eatery.thumbnailUrl, ...(eatery.galleryUrls || [])].filter(Boolean);
}

function EateryPhoto({ src, alt, lazy = true }) {
    const [failedSrc, setFailedSrc] = useState(null);
    return !src || failedSrc === src
        ? <span className="admin-photo-fallback" role="img" aria-label={alt || "Ảnh không khả dụng"}><Store aria-hidden="true" /></span>
        : <img src={src} alt={alt} loading={lazy ? "lazy" : "eager"} onError={() => setFailedSrc(src)} />;
}

function StatusBadge({ status }) {
    return <span className={`admin-status is-${status.toLowerCase()}`}>{statusLabel(status)}</span>;
}

export function StatusTabs({ active, counts, onChange, disabled }) {
    return <div className="admin-status-tabs" role="tablist" aria-label="Trạng thái quán ăn">
        {ADMIN_EATERY_TABS.map(({ status, label, icon: Icon }) => <button key={status} type="button" role="tab" aria-controls="admin-eatery-results" aria-selected={active === status} disabled={disabled} className={active === status ? "is-active" : ""} onClick={() => onChange(status)}><Icon aria-hidden="true" /><span>{label}</span><strong>{counts[status] ?? "..."}</strong></button>)}
    </div>;
}

export function AdminEateryCard({ eatery, onAction, onDetails, onPhoto, disabled }) {
    const photos = photosOf(eatery);
    return <article className="admin-eatery-card">
        <button type="button" className="admin-eatery-cover" disabled={!photos.length} onClick={() => onPhoto(photos, 0)} aria-label={`Xem ảnh ${eatery.name}`}><EateryPhoto src={eatery.thumbnailUrl} alt={eatery.name} /></button>
        <div className="admin-eatery-info">
            <div className="admin-eatery-title"><h2>{eatery.name}</h2><StatusBadge status={eatery.status} /></div>
            <div className="admin-eatery-meta"><span>{eatery.category}</span><span><MapPin aria-hidden="true" />{addressOf(eatery)}</span><span><Phone aria-hidden="true" />{eatery.phoneContact}</span></div>
            <p>{eatery.content}</p>
            {photos.length > 1 && <div className="admin-eatery-gallery">{photos.slice(0, 4).map((url, index) => <button key={`${url}-${index}`} type="button" aria-label={`Xem ảnh ${index + 1} của ${eatery.name}`} onClick={() => onPhoto(photos, index)}><EateryPhoto src={url} alt="" /></button>)}{photos.length > 4 && <button type="button" className="admin-gallery-more" onClick={() => onPhoto(photos, 4)}>+{photos.length - 4}</button>}</div>}
        </div>
        <div className="admin-eatery-owner"><div className="admin-owner-line"><span className="admin-owner-avatar"><CircleUserRound aria-hidden="true" /></span><div><strong>{eatery.owner.fullName}</strong><small>{eatery.owner.email}</small></div></div><div className="admin-date-line"><CalendarDays aria-hidden="true" /><span>Ngày đăng<br /><strong>{eatery.createdAt ? formatAdminDate(eatery.createdAt) : "Chưa có thông tin"}</strong></span></div></div>
        <div className="admin-eatery-actions">
            {eatery.status === "PENDING" && <><button type="button" className="admin-approve" disabled={disabled} onClick={() => onAction(eatery, "approve")}><Check aria-hidden="true" />Duyệt</button><button type="button" className="admin-reject" disabled={disabled} onClick={() => onAction(eatery, "reject")}><X aria-hidden="true" />Từ chối</button></>}
            {eatery.status === "REJECTED" && <button type="button" className="admin-approve" disabled={disabled} onClick={() => onAction(eatery, "approve")}><Check aria-hidden="true" />Duyệt lại</button>}
            <button type="button" className="admin-details-button" disabled={disabled} onClick={() => onDetails(eatery)}><Eye aria-hidden="true" />Xem chi tiết</button>
        </div>
    </article>;
}

function Dialog({ title, onClose, busy = false, children, className = "", onArrow }) {
    const dialogRef = useRef(null);
    useEffect(() => {
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        dialogRef.current?.querySelector("textarea, button:not(:disabled)")?.focus();
        return () => {
            document.body.style.overflow = previousOverflow;
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, []);

    useEffect(() => {
        if (busy) dialogRef.current?.focus();
    }, [busy]);

    function onKeyDown(event) {
        if (event.key === "Escape") {
            event.stopPropagation();
            if (!busy) onClose();
        }
        if (onArrow && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
            event.preventDefault();
            onArrow(event.key === "ArrowLeft" ? -1 : 1);
        }
        if (event.key !== "Tab") return;
        const focusable = [...dialogRef.current.querySelectorAll("button:not(:disabled), textarea:not(:disabled), a[href], [tabindex='0']")].filter((element) => element.getClientRects().length);
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first) { event.preventDefault(); dialogRef.current.focus(); }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    return <div className="admin-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }} onKeyDown={onKeyDown}>
        <section ref={dialogRef} className={`admin-dialog ${className}`} role="dialog" aria-modal="true" aria-label={title} aria-busy={busy} tabIndex={-1}>
            <div className="admin-dialog-heading"><h2>{title}</h2><button type="button" title="Đóng" aria-label="Đóng" disabled={busy} onClick={onClose}><X aria-hidden="true" /></button></div>
            {children}
        </section>
    </div>;
}

export function ActionDialog({ action, reason, onReason, onCancel, onConfirm, busy, error, reloadError, onRetry }) {
    const descriptions = { approve: "Quán ăn sẽ được công khai sau khi duyệt.", reject: "Lý do từ chối sẽ được lưu và hiển thị với người đăng." };
    const reasonLength = reason.trim().length;
    return <Dialog title={ACTION_LABELS[action.type]} onClose={onCancel} busy={busy}>
        <p><strong>{action.eatery.name}</strong><br />{descriptions[action.type]}</p>
        {error && <p className="admin-action-error" role="alert">{error}</p>}
        {action.needsRefresh && <p className="admin-action-refresh" role="status">{reloadError ? <>Không tải được thông tin mới. <button type="button" onClick={onRetry}><RefreshCw aria-hidden="true" />Thử lại</button></> : <><LoaderCircle className="admin-loading-icon" aria-hidden="true" />Đang tải thông tin mới...</>}</p>}
        {action.unavailable && <p className="admin-action-error">Quán không còn trong kết quả hiện tại. Vui lòng đóng hộp thoại và chọn lại từ danh sách.</p>}
        <div className="admin-action-summary"><StatusBadge status={action.eatery.status} /><p>{action.eatery.content}</p><small>{addressOf(action.eatery)}</small></div>
        {action.type === "reject" && <label className="admin-reason-label">Lý do từ chối <span>*</span><textarea value={reason} onChange={(event) => onReason(event.target.value)} disabled={busy} rows={4} minLength={10} maxLength={500} placeholder="Nêu lý do từ chối quán ăn..." /></label>}
        <div className="admin-dialog-actions"><button type="button" disabled={busy} onClick={onCancel}>Hủy</button><button type="button" className={action.type === "reject" ? "is-danger" : ""} disabled={busy || action.needsRefresh || action.unavailable || (action.type === "reject" && (reasonLength < 10 || reasonLength > 500))} onClick={onConfirm}>{busy ? "Đang xử lý..." : action.type === "approve" ? "Xác nhận duyệt" : "Xác nhận từ chối"}</button></div>
    </Dialog>;
}

export function DetailsDialog({ eatery, onClose, onPhoto }) {
    const photos = photosOf(eatery);
    return <Dialog title="Chi tiết quán ăn" onClose={onClose} className="admin-details-dialog">
        <div className="admin-details-head"><h3>{eatery.name}</h3><StatusBadge status={eatery.status} /></div>
        <p className="admin-eatery-description">{eatery.content}</p>
        <dl><div><dt>Danh mục</dt><dd>{eatery.category}</dd></div><div><dt>Địa chỉ</dt><dd>{addressOf(eatery)}</dd></div><div><dt>Điện thoại</dt><dd>{eatery.phoneContact}</dd></div><div><dt>Người đăng</dt><dd>{eatery.owner.fullName} · {eatery.owner.email}</dd></div><div><dt>Ngày đăng</dt><dd>{eatery.createdAt ? formatAdminDate(eatery.createdAt) : "Chưa có thông tin"}</dd></div>{eatery.rejectionReason && <div><dt>Lý do từ chối</dt><dd>{eatery.rejectionReason}</dd></div>}</dl>
        {photos.length > 0 && <div className="admin-details-photos">{photos.map((url, index) => <button key={`${url}-${index}`} type="button" aria-label={`Xem ảnh ${index + 1}`} onClick={() => onPhoto(photos, index)}><EateryPhoto src={url} alt="" /></button>)}</div>}
    </Dialog>;
}

export function PhotoDialog({ photos, index, onChange, onClose }) {
    return <Dialog title={`Ảnh quán ăn ${index + 1} / ${photos.length}`} onClose={onClose} className="admin-photo-dialog" onArrow={(direction) => onChange((index + direction + photos.length) % photos.length)}>
        <div className="admin-lightbox-stage">{photos.length > 1 && <button type="button" title="Ảnh trước" aria-label="Ảnh trước" onClick={() => onChange((index - 1 + photos.length) % photos.length)}><ChevronLeft aria-hidden="true" /></button>}<div className="admin-photo-stage"><EateryPhoto src={photos[index]} alt={`Ảnh quán ăn ${index + 1}`} lazy={false} /></div>{photos.length > 1 && <button type="button" title="Ảnh sau" aria-label="Ảnh sau" onClick={() => onChange((index + 1) % photos.length)}><ChevronRight aria-hidden="true" /></button>}</div>
    </Dialog>;
}

export function EateryPagination({ page, totalPages, totalElements, pageSize, disabled, onChange }) {
    if (!totalElements) return null;
    const pages = [...new Set([0, ...Array.from({ length: 5 }, (_, index) => page - 2 + index), totalPages - 1])].filter((value) => value >= 0 && value < totalPages).sort((a, b) => a - b);
    return <div className="admin-eatery-pagination"><span>Hiển thị {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} / {totalElements} quán</span>
        {totalPages > 1 && <nav className="admin-pagination" aria-label="Phân trang quán ăn">
            <button type="button" title="Trang trước" aria-label="Trang trước" disabled={disabled || page === 0} onClick={() => onChange(page - 1)}><ChevronLeft aria-hidden="true" /></button>
            {pages.map((value, index) => <span key={value} className="admin-page-entry">{index > 0 && value > pages[index - 1] + 1 && <span className="admin-page-gap" aria-hidden="true">...</span>}<button type="button" disabled={disabled} aria-label={`Trang ${value + 1}`} className={page === value ? "is-active" : ""} aria-current={page === value ? "page" : undefined} onClick={() => onChange(value)}>{value + 1}</button></span>)}
            <button type="button" title="Trang sau" aria-label="Trang sau" disabled={disabled || page >= totalPages - 1} onClick={() => onChange(page + 1)}><ChevronRight aria-hidden="true" /></button>
        </nav>}
    </div>;
}

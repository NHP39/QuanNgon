import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function AdminHeading({ title, description }) {
    return <div className="admin-heading"><div><h1>{title}</h1><p>{description}</p></div></div>;
}

export function AdminStat({ icon: Icon, label, value, tone }) {
    return <div className="admin-stat"><span className={`admin-stat-icon ${tone || ""}`}><Icon aria-hidden="true" /></span><span><small>{label}</small><strong>{value == null ? "..." : new Intl.NumberFormat("vi-VN").format(value)}</strong></span></div>;
}

export function AdminPagination({ page, totalPages, onChange, pageSize, count, disabled = false }) {
    if (!count) return null;
    const pages = [...new Set([0, ...Array.from({ length: 5 }, (_, offset) => page - 2 + offset), totalPages - 1])]
        .filter((index) => index >= 0 && index < totalPages).sort((a, b) => a - b);
    return <div className="admin-table-footer"><span>Hiển thị {page * pageSize + 1} - {Math.min((page + 1) * pageSize, count)} trong tổng số {count} kết quả</span><div className="admin-pagination" role="group" aria-label="Phân trang"><button type="button" disabled={disabled || !page} onClick={() => onChange(page - 1)} aria-label="Trang trước"><ChevronLeft /></button>{pages.map((index, position) => <span key={index} className="admin-pagination-item">{position > 0 && index - pages[position - 1] > 1 && <span className="admin-pagination-gap" aria-hidden="true">...</span>}<button type="button" disabled={disabled} className={index === page ? "is-active" : ""} onClick={() => onChange(index)} aria-label={`Trang ${index + 1}`} aria-current={index === page ? "page" : undefined}>{index + 1}</button></span>)}<button type="button" disabled={disabled || page >= totalPages - 1} onClick={() => onChange(page + 1)} aria-label="Trang sau"><ChevronRight /></button></div></div>;
}

export function AdminDialog({ title, onClose, children, busy = false }) {
    const closeButton = useRef(null);
    const dialog = useRef(null);
    useEffect(() => {
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeButton.current?.focus();
        return () => { document.body.style.overflow = previousOverflow; if (previousFocus?.isConnected) previousFocus.focus?.(); };
    }, []);
    useEffect(() => { if (busy) dialog.current?.focus(); }, [busy]);
    function handleKeyDown(event) {
        if (event.key === "Escape") {
            event.stopPropagation();
            if (!busy) onClose();
        }
        if (event.key !== "Tab") return;
        const controls = [...dialog.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')]
            .filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (!first) { event.preventDefault(); dialog.current.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    }
    return <div className="admin-dialog-backdrop" onMouseDown={(event) => { if (!busy && event.target === event.currentTarget) onClose(); }} onKeyDown={handleKeyDown}><div ref={dialog} tabIndex={-1} className="admin-dialog" role="dialog" aria-modal="true" aria-label={title} aria-busy={busy}><div className="admin-dialog-head"><h2>{title}</h2><button ref={closeButton} disabled={busy} type="button" className="admin-icon-button" onClick={onClose} aria-label="Đóng"><X /></button></div>{children}</div></div>;
}

import { isConnectionError } from "../services/apiClient";
import { PageLoadError } from "./PageLoadError";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, LoaderCircle, Plus, Store, Trash2, X } from "lucide-react";
import { AccountEateryCard, AccountEateryPhoto } from "./AccountEateryCard";
import { EATERY_STATUS_LABELS } from "../data/eateryStatus";
import { MY_EATERIES_PAGE_SIZE, useMyEateries } from "../hooks/useMyEateries";
import { deleteMyEatery, updateMyEateryVisibility } from "../services/userEateryService";

const filters = [["ALL", "Tất cả"], ...Object.entries(EATERY_STATUS_LABELS)];
const actions = {
    hide: { title: "Ẩn quán ăn?", label: "Xác nhận ẩn", message: "Quán sẽ không còn hiển thị công khai. Bạn có thể bỏ ẩn để hiển thị lại.", icon: EyeOff, success: "Đã ẩn quán ăn." },
    unhide: { title: "Bỏ ẩn quán ăn?", label: "Xác nhận bỏ ẩn", message: "Quán đã được duyệt sẽ hiển thị công khai trở lại.", icon: Eye, success: "Đã bỏ ẩn quán ăn." },
    delete: { title: "Xóa quán ăn?", label: "Xác nhận xóa", message: "Quán, ảnh và các đánh giá liên quan sẽ bị xóa. Thao tác này không thể hoàn tác.", icon: Trash2, success: "Đã xóa quán ăn." }
};

function OwnedEateryDialog({ selection, onClose, onConfirm, onRefresh }) {
    const dialog = useRef(null);
    const cancelButton = useRef(null);
    const mounted = useRef(false);
    const submitting = useRef(false);
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState(null);
    const { type, eatery } = selection;
    const action = actions[type];
    const photos = [eatery.thumbnailUrl, ...(eatery.galleryUrls || [])].filter(Boolean);
    const needsLogin = failure?.status === 401;
    const needsRefresh = Boolean(failure && (!failure.status || failure.status >= 500
        || [401, 403, 404, 409].includes(failure.status)));

    useEffect(() => {
        mounted.current = true;
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        const element = dialog.current;
        element.showModal();
        document.body.style.overflow = "hidden";
        if (cancelButton.current) cancelButton.current.focus();
        else element.querySelector("h2")?.focus();
        return () => {
            mounted.current = false;
            element.close();
            document.body.style.overflow = previousOverflow;
            if (previousFocus?.isConnected) previousFocus.focus?.();
        };
    }, []);

    function close() { if (!submitting.current) onClose(); }

    async function confirm(event) {
        event.preventDefault();
        if (submitting.current || needsRefresh) return;
        submitting.current = true;
        setBusy(true);
        setFailure(null);
        try { await onConfirm(type, eatery); }
        catch (error) { if (mounted.current) setFailure(error); }
        finally { submitting.current = false; if (mounted.current) setBusy(false); }
    }

    return <dialog ref={dialog} className="account-owned-dialog" aria-labelledby="owned-dialog-title" onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault(); close();
    }}>
        <div className="account-owned-dialog-heading"><h2 id="owned-dialog-title" tabIndex={-1}>{action?.title || "Chi tiết quán ăn"}</h2><button type="button" aria-label="Đóng hộp thoại quán ăn" disabled={busy} onClick={close}><X aria-hidden="true" /></button></div>
        <h3>{eatery.name}</h3><span className={`account-status is-${eatery.status.toLowerCase()}`}>{EATERY_STATUS_LABELS[eatery.status]}</span>
        {action ? <><p>{action.message}</p>{failure && <p className="account-form-error" role="alert">{failure.message || "Không thể lưu thay đổi."}</p>}
            {needsRefresh && <p>Vui lòng kiểm tra lại danh sách trước khi thao tác tiếp.</p>}
            {needsLogin ? <a className="account-outline" href="/login">Đăng nhập lại</a> : needsRefresh && <button type="button" className="account-outline" onClick={onRefresh}>Tải lại danh sách</button>}
            <form onSubmit={confirm} aria-busy={busy}><div className="account-owned-dialog-actions"><button ref={cancelButton} type="button" className="account-outline" disabled={busy} onClick={close}>Hủy</button><button type="submit" className={`account-primary${type === "delete" ? " account-danger" : ""}`} disabled={busy || needsRefresh}>{busy ? <LoaderCircle aria-hidden="true" /> : <action.icon aria-hidden="true" />}{busy ? "Đang xử lý..." : action.label}</button></div></form></>
            : <><p className="account-private-description">{eatery.content}</p><dl className="account-private-fields"><div><dt>Danh mục</dt><dd>{eatery.category}</dd></div><div><dt>Địa chỉ</dt><dd>{[eatery.street, eatery.ward, eatery.province].filter(Boolean).join(", ")}</dd></div><div><dt>Điện thoại</dt><dd>{eatery.phoneContact || "Chưa cập nhật"}</dd></div>{eatery.status === "REJECTED" && eatery.rejectionReason && <div><dt>Lý do từ chối</dt><dd>{eatery.rejectionReason}</dd></div>}</dl>
                {photos.length > 0 && <div className="account-private-photos">{photos.map((url, index) => <div key={`${url}-${index}`}><AccountEateryPhoto src={url} alt={`Ảnh ${index + 1} của ${eatery.name}`} /></div>)}</div>}
                <div className="account-owned-dialog-actions"><button type="button" className="account-outline" onClick={close}>Đóng</button></div></>}
    </dialog>;
}

export function OwnedEateriesPanel({ onPreview }) {
    const { data, loading, error, status: filter, page, setStatus, setPage, reload } = useMyEateries();
    const [selection, setSelection] = useState(null);
    const [notice, setNotice] = useState("");
    const mounted = useRef(false);
    const needsLogin = error?.status === 401;
    const eateries = data?.content || [];
    const totalElements = data?.totalElements || 0;
    const totalPages = data?.totalPages || 0;

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    async function confirm(type, eatery) {
        if (!Object.hasOwn(actions, type)) throw new Error("Thao tác không hợp lệ.");
        if (type === "delete") await deleteMyEatery(eatery.id);
        else await updateMyEateryVisibility(eatery.id, { hidden: type === "hide", version: eatery.version });
        if (!mounted.current) return;
        setSelection(null);
        setNotice(actions[type].success);
        reload();
    }

    function refresh() {
        setSelection(null);
        setNotice("");
        reload();
    }

    return <section className="account-list-section" aria-labelledby="account-owned-heading">
        <div className="account-section-heading"><div><h2 id="account-owned-heading">Quán ăn đã chia sẻ</h2><p>{loading ? "Đang tải danh sách..." : error ? "Chưa tải được danh sách" : `${totalElements} quán ăn`}</p></div><a className="account-primary" href="/eateries/new"><Plus aria-hidden="true" />Đăng quán</a></div>
        {notice && <p className="account-owned-notice" role="status">{notice}</p>}
        <div className="account-list-tools"><div className="account-filter-tabs" aria-label="Lọc trạng thái">{filters.map(([value, label]) => <button type="button" key={value} className={filter === value ? "is-active" : ""} aria-pressed={filter === value} disabled={needsLogin} onClick={() => { setStatus(value); setSelection(null); setNotice(""); }}>{label}</button>)}</div></div>
        <div aria-busy={loading} aria-live="polite">
            {loading ? <div className="account-loading" role="status"><LoaderCircle className="account-profile-spinner" aria-hidden="true" /> Đang tải quán đã chia sẻ...</div>
                : isConnectionError(error) ? <PageLoadError onRetry={reload} />
                    : error ? <div className="account-owned-error" role="alert"><p>{needsLogin ? "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền truy cập. Vui lòng đăng nhập lại." : error.message}</p>{needsLogin ? <a className="account-outline" href="/login">Đăng nhập lại</a> : <button type="button" className="account-outline" onClick={reload}>Thử lại</button>}</div>
                    : eateries.length ? <div className="account-eatery-list">{eateries.map((eatery) => <AccountEateryCard key={eatery.id} eatery={eatery} owned onPreview={onPreview} onDetails={(item) => setSelection({ type: "details", eatery: item })} onAction={(type, item) => { setNotice(""); setSelection({ type, eatery: item }); }} />)}</div>
                        : <div className="account-empty"><Store aria-hidden="true" /><strong>Không có quán ăn phù hợp</strong><a href="/eateries/new">Đăng quán ăn</a></div>}
        </div>
        {!loading && !error && totalElements > 0 && <div className="account-owned-pagination"><span>Hiển thị {page * MY_EATERIES_PAGE_SIZE + 1}–{Math.min((page + 1) * MY_EATERIES_PAGE_SIZE, totalElements)} / {totalElements} quán</span><nav aria-label="Phân trang quán đã chia sẻ"><button type="button" aria-label="Trang trước" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft aria-hidden="true" /></button><span>Trang {page + 1}/{totalPages}</span><button type="button" aria-label="Trang sau" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight aria-hidden="true" /></button></nav></div>}
        {selection && <OwnedEateryDialog selection={selection} onClose={() => setSelection(null)} onConfirm={confirm} onRefresh={refresh} />}
    </section>;
}

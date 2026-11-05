import { isConnectionError, getApiErrorMessage } from "../services/apiClient";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, RefreshCw, Search, Store, X } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { PageLoadError } from "../components/PageLoadError";
import { ActionDialog, AdminEateryCard, DetailsDialog, EateryPagination, PhotoDialog, StatusTabs } from "../components/admin/AdminEateryParts";
import { ACTION_TARGETS, ADMIN_EATERY_TABS } from "../data/adminEateryConfig";
import { ADMIN_EATERY_PAGE_SIZE, useAdminEateries } from "../hooks/useAdminEateries";
import { updateAdminEateryStatus } from "../services/adminEateryService";
import "./AdminEateries.css";

function AdminEateriesContent() {
    const [action, setAction] = useState(null);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState("");
    const [details, setDetails] = useState(null);
    const [lightbox, setLightbox] = useState(null);
    const [notice, setNotice] = useState("");
    const submitting = useRef(false);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    // Refresh the decision snapshot only after a failed action, never silently during review.
    const onLoaded = useCallback((data) => {
        setAction((current) => {
            if (!current?.needsRefresh) return current;
            const fresh = data.content.find((item) => item.id === current.eatery.id);
            return { ...current, eatery: fresh || current.eatery, needsRefresh: false, unavailable: !fresh };
        });
    }, []);
    const { data, hasCurrentData, loading, error, activeStatus, page, query, searchPending, setQuery, setStatus, setPage, refetch } = useAdminEateries(onLoaded);

    function openAction(eatery, type) {
        if (busy || loading || searchPending || !Object.hasOwn(ACTION_TARGETS, type)) return;
        setAction({ eatery, type });
        setActionError("");
        setReason("");
    }

    async function confirmAction() {
        const reasonLength = reason.trim().length;
        if (!action || !Object.hasOwn(ACTION_TARGETS, action.type) || submitting.current || action.needsRefresh || action.unavailable
            || (action.type === "reject" && (reasonLength < 10 || reasonLength > 500))) return;
        submitting.current = true;
        setBusy(true);
        setActionError("");
        try {
            const updated = await updateAdminEateryStatus(action.eatery.id, {
                status: ACTION_TARGETS[action.type], reason, version: action.eatery.version
            });
            if (!mounted.current) return;
            const label = ADMIN_EATERY_TABS.find((tab) => tab.status === updated.status).label.toLowerCase();
            setNotice(updated.name + ": " + label + ".");
            setAction(null);
            refetch();
        } catch (failure) {
            if (!mounted.current) return;
            setActionError(getApiErrorMessage(failure));
            if (failure.status === 409 || failure.status === 404 || !failure.status) {
                setAction((current) => ({ ...current, needsRefresh: true }));
                refetch();
            }
        } finally {
            submitting.current = false;
            if (mounted.current) setBusy(false);
        }
    }

    const totalElements = data?.totalElements ?? 0;
    const disabled = loading || busy || searchPending;
    const sessionExpired = error?.status === 401;

    return <>
        <div className="admin-heading"><div><h1>Quản lý quán ăn</h1><p>Duyệt, quản lý và xử lý các bài đăng quán ăn từ người dùng.</p></div></div>
        {notice && <div className="admin-notice" role="status">{notice}<button type="button" title="Đóng thông báo" aria-label="Đóng thông báo" onClick={() => setNotice("")}><X aria-hidden="true" /></button></div>}
        <StatusTabs active={activeStatus} counts={data?.counts || {}} disabled={busy} onChange={(status) => { setStatus(status); setNotice(""); }} />
        <div className="admin-list-toolbar"><span>{loading || searchPending ? "Đang tải..." : totalElements + " quán ăn"}</span><label className="admin-search"><Search aria-hidden="true" /><input type="search" value={query} disabled={busy} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên hoặc mô tả quán" aria-label="Tìm tên hoặc mô tả quán" /></label></div>
        <section id="admin-eatery-results" className="admin-eatery-results" aria-label="Danh sách quán ăn" aria-busy={loading || searchPending}>
            {loading && !hasCurrentData ? <div className="admin-empty" role="status"><LoaderCircle className="admin-loading-icon" aria-hidden="true" /><p>Đang tải danh sách quán ăn...</p></div>
                : isConnectionError(error) ? <PageLoadError onRetry={refetch} />
                    : error ? <div className="admin-empty admin-eatery-error" role="alert"><Store aria-hidden="true" /><h2>{sessionExpired ? "Không thể truy cập danh sách" : "Không tải được danh sách"}</h2><p>{error.message}</p><div className="admin-list-error-actions">{sessionExpired && <a href="/login">Đăng nhập lại</a>}<button type="button" onClick={refetch}><RefreshCw aria-hidden="true" />Thử lại</button></div></div>
                    : data?.content.length ? <div className="admin-eatery-list">{data.content.map((eatery) => <AdminEateryCard key={eatery.id} eatery={eatery} onAction={openAction} onDetails={setDetails} onPhoto={(photos, index) => setLightbox({ photos, index })} disabled={disabled} />)}</div>
                        : <div className="admin-empty"><Store aria-hidden="true" /><h2>Không có quán ăn phù hợp</h2><p>{query.trim() ? "Thử từ khóa khác hoặc chọn trạng thái khác." : "Chưa có quán ăn trong trạng thái này."}</p></div>}
        </section>
        {!error && data && <EateryPagination page={page} totalPages={data.totalPages} totalElements={totalElements} pageSize={data.size || ADMIN_EATERY_PAGE_SIZE} disabled={disabled} onChange={setPage} />}
        {action && <ActionDialog action={action} reason={reason} onReason={setReason} onCancel={() => { if (!submitting.current) setAction(null); }} onConfirm={confirmAction} busy={busy} error={actionError} reloadError={error} onRetry={refetch} />}
        {details && <DetailsDialog eatery={details} onClose={() => setDetails(null)} onPhoto={(photos, index) => { setDetails(null); setLightbox({ photos, index }); }} />}
        {lightbox && <PhotoDialog {...lightbox} onChange={(index) => setLightbox((current) => ({ ...current, index }))} onClose={() => setLightbox(null)} />}
    </>;
}

function AdminEateries() {
    return <AdminLayout active="eateries"><AdminEateriesContent /></AdminLayout>;
}

export default AdminEateries;

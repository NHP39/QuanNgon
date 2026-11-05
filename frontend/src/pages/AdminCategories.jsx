import { isConnectionError } from "../services/apiClient";
import { useEffect, useRef, useState } from "react";
import { LayoutGrid, LoaderCircle, Pencil, Plus, RefreshCw, Search, Store, Trash2, X } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { PageLoadError } from "../components/PageLoadError";
import { AdminDialog, AdminHeading, AdminPagination, AdminStat } from "../components/AdminScreenParts";
import { useAdminCategories } from "../hooks/useAdminCategories";
import { createAdminCategory, deleteAdminCategory, updateAdminCategory } from "../services/adminCategoryService";
import "./AdminCommon.css";
import "./AdminCategories.css";

export default function AdminCategories() {
    return <AdminLayout active="categories"><AdminCategoriesContent /></AdminLayout>;
}

function AdminCategoriesContent() {
    const { data, hasCurrentData, loading, error, query, page, searchPending, setQuery, setPage, refetch } = useAdminCategories();
    const [dialog, setDialog] = useState(null);
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState("");
    const [accessError, setAccessError] = useState(null);
    const [notice, setNotice] = useState(null);
    const submitting = useRef(false);
    const mounted = useRef(false);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    function openDialog(type, item = null) {
        setName(item?.name || "");
        setActionError("");
        setDialog({ type, item });
    }

    function closeDialog() {
        if (submitting.current) return;
        setDialog(null);
        setActionError("");
    }

    async function submitCategory(event) {
        event.preventDefault();
        if (submitting.current || !dialog) return;
        const deleting = dialog.type === "delete";
        const cleanName = name.replace(/\s+/gu, " ").trim();
        if (!deleting && (cleanName.length < 2 || cleanName.length > 80)) {
            setActionError("Tên danh mục cần từ 2 đến 80 ký tự.");
            return;
        }
        submitting.current = true;
        setBusy(true);
        setActionError("");
        setNotice(null);
        try {
            if (deleting) await deleteAdminCategory(dialog.item.id);
            else if (dialog.item) await updateAdminCategory(dialog.item.id, cleanName);
            else await createAdminCategory(cleanName);
            if (!mounted.current) return;
            setDialog(null);
            setNotice({ tone: "success", message: deleting ? `Đã xóa danh mục ${dialog.item.name}.` : `Đã ${dialog.item ? "cập nhật" : "thêm"} danh mục ${cleanName}.` });
            refetch({ resetPage: !dialog.item });
        } catch (failure) {
            if (!mounted.current) return;
            if (failure.status === 401 || failure.status === 403) {
                setDialog(null);
                setAccessError(failure);
            } else if (failure.status === 400 || (!deleting && failure.status === 409)) {
                setActionError(failure.message);
            } else if (isConnectionError(failure)) {
                setActionError("Chưa xác nhận được kết quả thao tác. Hãy kiểm tra danh sách trước khi gửi lại.");
            } else {
                setDialog(null);
                const knownFailure = failure.status === 404 || failure.status === 409;
                setNotice({
                    tone: "warning",
                    message: knownFailure ? failure.message : "Chưa xác nhận được kết quả thao tác. Đang tải lại danh sách; hãy kiểm tra trước khi thử lại."
                });
                refetch();
            }
        } finally {
            submitting.current = false;
            if (mounted.current) setBusy(false);
        }
    }

    const authorizationError = accessError || ([401, 403].includes(error?.status) ? error : null);
    if (authorizationError) {
        return <section className="admin-screen admin-categories-screen">
            <AdminHeading title="Quản lý danh mục" description="Xem danh sách và quản lý danh mục quán ăn." />
            <div className="admin-category-feedback" role="alert"><p>{authorizationError.status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." : "Bạn không có quyền quản lý danh mục."}</p><a className="admin-outline" href={authorizationError.status === 401 ? "/login" : "/home"}>{authorizationError.status === 401 ? "Đăng nhập" : "Về trang chủ"}</a></div>
        </section>;
    }

    const waiting = loading || searchPending;
    const actionsDisabled = waiting || busy || !!error || !hasCurrentData;
    const categories = hasCurrentData ? data.content : [];

    if (isConnectionError(error) && !dialog) return <PageLoadError onRetry={() => refetch()} />;

    return <section className="admin-screen admin-categories-screen">
        <AdminHeading title="Quản lý danh mục" description="Xem danh sách và quản lý danh mục quán ăn." />
        <div className="admin-stats admin-category-stats">
            <AdminStat icon={LayoutGrid} label="Tổng danh mục" value={data?.summary.total} />
            <AdminStat icon={Store} label="Tổng quán theo danh mục" value={data?.summary.eateryCount} />
        </div>
        {notice && <div className={`admin-category-notice ${notice.tone}`} role="status"><span>{notice.message}</span><button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo" title="Đóng thông báo"><X aria-hidden="true" /></button></div>}
        <div className="admin-tools">
            <label className="admin-tool-search"><Search aria-hidden="true" /><input value={query} disabled={busy} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm danh mục theo tên..." aria-label="Tìm danh mục" /></label>
            <button type="button" className="admin-primary" disabled={busy || !!error} onClick={() => openDialog("edit")}><Plus aria-hidden="true" />Thêm danh mục</button>
        </div>
        <div className="admin-category-request-status" role="status">{waiting && <><LoaderCircle className="admin-category-spinner" aria-hidden="true" />Đang tải danh mục...</>}</div>
        {error && <div className="admin-category-feedback" role="alert"><p>{error.message || "Không thể tải danh sách danh mục."}</p><button type="button" className="admin-outline" disabled={loading} onClick={() => refetch()}><RefreshCw aria-hidden="true" />Thử lại</button></div>}
        <div className="admin-table-scroll" aria-busy={waiting}>
            <table className="admin-data-table admin-categories-table" aria-label="Danh sách danh mục">
                <thead><tr><th scope="col">Danh mục</th><th scope="col">Số quán</th><th scope="col">Thao tác</th></tr></thead>
                <tbody>{categories.length ? categories.map((item) => <tr key={item.id}>
                    <td><strong>{item.name}</strong></td>
                    <td><span className="admin-category-count"><Store aria-hidden="true" />{item.eateryCount}</span></td>
                    <td><div className="admin-row-actions">
                        <button type="button" className="admin-icon-button" disabled={actionsDisabled} onClick={() => openDialog("edit", item)} title="Sửa danh mục" aria-label={`Sửa ${item.name}`}><Pencil aria-hidden="true" /></button>
                        <button type="button" className="admin-outline admin-category-delete" disabled={actionsDisabled || item.eateryCount > 0} onClick={() => openDialog("delete", item)} aria-label={`Xóa ${item.name}`} title={item.eateryCount > 0 ? "Không thể xóa danh mục đang có quán" : "Xóa danh mục"}><Trash2 aria-hidden="true" /><span>Xóa</span></button>
                    </div></td>
                </tr>) : <tr><td className="admin-empty" colSpan="3">{waiting ? "Đang tải danh sách..." : error ? "Chưa tải được danh sách danh mục." : "Không tìm thấy danh mục phù hợp."}</td></tr>}</tbody>
            </table>
        </div>
        {hasCurrentData && <AdminPagination page={page} totalPages={data.totalPages} onChange={setPage} count={data.totalElements} pageSize={data.size} disabled={actionsDisabled} />}
        {dialog && <AdminDialog title={dialog.type === "delete" ? "Xóa danh mục" : dialog.item ? "Sửa danh mục" : "Thêm danh mục"} onClose={closeDialog} busy={busy}>
            <form onSubmit={submitCategory}>
                {dialog.type === "delete" ? <p>Bạn có chắc muốn xóa danh mục <strong>{dialog.item.name}</strong>? Thao tác này không thể hoàn tác.</p> : <label className="admin-field">Tên danh mục<input required maxLength="80" disabled={busy} value={name} onChange={(event) => { setName(event.target.value); setActionError(""); }} placeholder="Nhập tên danh mục" aria-invalid={!!actionError} aria-describedby={actionError ? "category-action-error" : undefined} /></label>}
                {actionError && <p id="category-action-error" className="admin-form-error" role="alert">{actionError}</p>}
                <div className="admin-dialog-actions"><button type="button" className="admin-outline" disabled={busy} onClick={closeDialog}>Hủy</button><button type="submit" className="admin-primary" disabled={busy}>{busy && <LoaderCircle className="admin-category-spinner" aria-hidden="true" />}{busy ? "Đang xử lý..." : dialog.type === "delete" ? "Xóa danh mục" : dialog.item ? "Lưu thay đổi" : "Thêm danh mục"}</button></div>
            </form>
        </AdminDialog>}
    </section>;
}

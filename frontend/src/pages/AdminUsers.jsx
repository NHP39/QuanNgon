import { isConnectionError } from "../services/apiClient";
import { useEffect, useRef, useState } from "react";
import { Ellipsis, LoaderCircle, LockKeyhole, Mail, RefreshCw, Search, UnlockKeyhole, UserRound, UsersRound, X } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { PageLoadError } from "../components/PageLoadError";
import { AdminDialog, AdminHeading, AdminPagination, AdminStat } from "../components/AdminScreenParts";
import { formatAdminDate } from "../data/adminFormat";
import { useAdminUsers } from "../hooks/useAdminUsers";
import { updateAdminUserStatus } from "../services/adminUserService";
import "./AdminCommon.css";
import "./AdminUsers.css";

export default function AdminUsers() {
    return <AdminLayout active="users"><AdminUsersContent /></AdminLayout>;
}

function AdminUsersContent() {
    const { data, hasCurrentData, loading, error, query, status, sort, page, searchPending, setQuery, setStatus, setSort, setPage, refetch } = useAdminUsers();
    const [dialog, setDialog] = useState(null);
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

    function closeDialog() {
        if (submitting.current) return;
        setDialog(null);
        setActionError("");
    }

    function openDialog(type, user) {
        setActionError("");
        setDialog({ type, user, targetActive: !user.active });
    }

    async function changeUserStatus() {
        if (submitting.current || dialog?.type !== "toggle") return;
        submitting.current = true;
        setBusy(true);
        setActionError("");
        setNotice(null);
        try {
            await updateAdminUserStatus(dialog.user.id, dialog.targetActive);
            if (!mounted.current) return;
            setDialog(null);
            setNotice({ message: `Đã ${dialog.targetActive ? "mở khóa" : "khóa"} tài khoản ${dialog.user.fullName}.`, tone: "success" });
            refetch();
        } catch (failure) {
            if (!mounted.current) return;
            if (failure.status === 401 || failure.status === 403) {
                setDialog(null);
                setAccessError(failure);
            } else if (failure.status === 400) {
                setActionError(failure.message);
            } else {
                setDialog(null);
                const knownConflict = failure.status === 404 || failure.status === 409;
                setNotice({
                    tone: "warning",
                    message: knownConflict ? failure.message : "Chưa xác nhận được kết quả thao tác. Đang tải lại danh sách; hãy kiểm tra trạng thái trước khi thử lại."
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
        return <section className="admin-screen admin-users-screen">
            <AdminHeading title="Quản lý người dùng" description="Theo dõi trạng thái và khóa/mở khóa người dùng." />
            <div className="admin-users-feedback" role="alert"><p>{authorizationError.status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." : "Bạn không có quyền quản lý người dùng."}</p><a className="admin-outline" href={authorizationError.status === 401 ? "/login" : "/home"}>{authorizationError.status === 401 ? "Đăng nhập" : "Về trang chủ"}</a></div>
        </section>;
    }

    const waiting = loading || searchPending;
    const actionsDisabled = waiting || busy || !!error || !hasCurrentData;
    const users = hasCurrentData ? data.content : [];

    if (isConnectionError(error) && !dialog) return <PageLoadError onRetry={refetch} />;

    return <section className="admin-screen admin-users-screen">
        <AdminHeading title="Quản lý người dùng" description="Theo dõi trạng thái và khóa/mở khóa người dùng." />
        <div className="admin-stats">
            <AdminStat icon={UsersRound} label="Tổng người dùng" value={data?.summary.total} />
            <AdminStat icon={UserRound} label="Đang hoạt động" value={data?.summary.active} tone="green" />
            <AdminStat icon={LockKeyhole} label="Bị khóa" value={data?.summary.locked} />
        </div>
        {notice && <div className={`admin-users-notice ${notice.tone}`} role="status"><span>{notice.message}</span><button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo" title="Đóng thông báo"><X aria-hidden="true" /></button></div>}
        <div className="admin-tools">
            <label className="admin-tool-search"><Search aria-hidden="true" /><input value={query} disabled={busy} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên, email..." aria-label="Tìm người dùng" /></label>
            <select className="admin-select" value={status} disabled={busy} onChange={(event) => setStatus(event.target.value)} aria-label="Lọc trạng thái"><option value="all">Tất cả trạng thái</option><option value="active">Hoạt động</option><option value="locked">Bị khóa</option></select>
            <select className="admin-select" value={sort} disabled={busy} onChange={(event) => setSort(event.target.value)} aria-label="Sắp xếp người dùng"><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option></select>
        </div>
        <div className="admin-users-request-status" role="status">{waiting && <><LoaderCircle className="admin-users-spinner" aria-hidden="true" />Đang tải người dùng...</>}</div>
        {error && <div className="admin-users-feedback" role="alert"><p>{error.message || "Không thể tải danh sách người dùng."}</p><button type="button" className="admin-outline" disabled={loading} onClick={refetch}><RefreshCw aria-hidden="true" />Thử lại</button></div>}
        <div className="admin-table-scroll" aria-busy={waiting}>
            <table className="admin-data-table admin-users-table" aria-label="Danh sách người dùng">
                <thead><tr><th scope="col">Người dùng</th><th scope="col">Email</th><th scope="col">Trạng thái</th><th scope="col">Ngày tạo</th><th scope="col">Thao tác</th></tr></thead>
                <tbody>{users.length ? users.map((user) => <tr key={user.id}>
                    <td><div className="admin-user-cell"><span className="admin-user-avatar" aria-hidden="true">{user.fullName.trim().split(/\s+/).at(-1)?.slice(0, 1)}</span><strong>{user.fullName}</strong></div></td>
                    <td><div className="admin-table-contact"><span><Mail aria-hidden="true" />{user.email}</span></div></td>
                    <td><span className={`admin-status-pill ${user.active ? "" : "locked"}`}>{user.active ? "Hoạt động" : "Bị khóa"}</span></td>
                    <td className="admin-muted">{formatAdminDate(user.createdAt)}</td>
                    <td><div className="admin-row-actions"><button type="button" className="admin-outline" disabled={actionsDisabled} onClick={() => openDialog("toggle", user)}>{user.active ? <LockKeyhole aria-hidden="true" /> : <UnlockKeyhole aria-hidden="true" />}{user.active ? "Khóa tài khoản" : "Mở khóa"}</button><button type="button" className="admin-icon-button" disabled={actionsDisabled} title="Xem thông tin" aria-label={`Xem ${user.fullName}`} onClick={() => openDialog("detail", user)}><Ellipsis aria-hidden="true" /></button></div></td>
                </tr>) : <tr><td className="admin-empty" colSpan="5">{waiting ? "Đang tải danh sách..." : error ? "Chưa tải được danh sách người dùng." : "Không tìm thấy người dùng phù hợp."}</td></tr>}</tbody>
            </table>
        </div>
        {hasCurrentData && <AdminPagination page={page} totalPages={data.totalPages} onChange={setPage} count={data.totalElements} pageSize={data.size} disabled={actionsDisabled} />}
        {dialog?.type === "toggle" && <AdminDialog title={dialog.targetActive ? "Mở khóa tài khoản" : "Khóa tài khoản"} onClose={closeDialog} busy={busy}>
            <p className="admin-user-confirm">{dialog.targetActive ? "Người dùng sẽ có thể đăng nhập lại. Phiên đăng nhập cũ không được gia hạn trở lại." : "Người dùng sẽ bị chặn đăng nhập và không thể gia hạn các phiên đăng nhập cũ."} Xác nhận thao tác với <strong>{dialog.user.fullName}</strong>?</p>
            {actionError && <p className="admin-form-error" role="alert">{actionError}</p>}
            <div className="admin-dialog-actions"><button type="button" className="admin-outline" disabled={busy} onClick={closeDialog}>Hủy</button><button type="button" className="admin-primary" disabled={busy} onClick={changeUserStatus}>{busy && <LoaderCircle className="admin-users-spinner" aria-hidden="true" />}{busy ? "Đang xử lý..." : "Xác nhận"}</button></div>
        </AdminDialog>}
        {dialog?.type === "detail" && <AdminDialog title="Thông tin người dùng" onClose={closeDialog}><div className="admin-detail-list"><p><strong>Họ tên:</strong> {dialog.user.fullName}</p><p><strong>Email:</strong> {dialog.user.email}</p><p><strong>Trạng thái:</strong> {dialog.user.active ? "Hoạt động" : "Bị khóa"}</p><p><strong>Ngày tạo:</strong> {formatAdminDate(dialog.user.createdAt)}</p></div></AdminDialog>}
    </section>;
}

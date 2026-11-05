import { isConnectionError } from "../services/apiClient";
import { useState } from "react";
import { ChartColumnIncreasing, ChartNoAxesCombined, Clock3, LoaderCircle, RefreshCw } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { PageLoadError } from "../components/PageLoadError";
import { AdminHeading } from "../components/AdminScreenParts";
import { SeriesSummary, StatusDonut, TimeSeriesChart } from "../components/admin/AdminOverviewCharts";
import { useAdminDashboard } from "../hooks/useAdminDashboard";
import "./AdminCommon.css";
import "./AdminOverview.css";

export default function AdminOverview() {
    return <AdminLayout active="overview"><AdminOverviewContent /></AdminLayout>;
}

function DayFilter({ value, onChange, label }) {
    return <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
        <option value="7">7 ngày qua</option><option value="30">30 ngày qua</option><option value="90">90 ngày qua</option>
    </select>;
}

function ReloadButton({ request, label }) {
    return <button type="button" className="admin-icon-button" disabled={request.loading} onClick={request.reload} aria-label={label} title={label}><RefreshCw aria-hidden="true" /></button>;
}

function StatisticContent({ request, children }) {
    if (request.loading) return <div className="admin-chart-request" role="status"><LoaderCircle className="admin-overview-spinner" aria-hidden="true" /><p>Đang tải thống kê...</p></div>;
    if (isConnectionError(request.error)) return <PageLoadError compact title="Không tải được thống kê" onRetry={request.reload} />;
    if (request.error) return <div className="admin-chart-request admin-chart-error" role="alert"><p>{request.error.message || "Không thể tải thống kê."}</p><button type="button" className="admin-outline" onClick={request.reload}><RefreshCw aria-hidden="true" />Thử lại</button></div>;
    return children(request.data);
}

function AdminOverviewContent() {
    const [userDays, setUserDays] = useState("30");
    const [postDays, setPostDays] = useState("30");
    const { users, statuses, posts } = useAdminDashboard(userDays, postDays);
    const authorizationError = [users, statuses, posts].find((request) => [401, 403].includes(request.error?.status))?.error;

    if ([users, statuses, posts].every((request) => isConnectionError(request.error))) {
        return <PageLoadError onRetry={() => { users.reload(); statuses.reload(); posts.reload(); }} />;
    }

    if (authorizationError) return <section className="admin-screen admin-overview">
        <AdminHeading title="Tổng quan" description="Theo dõi đăng ký mới, tình trạng quán ăn và bài đăng mới." />
        <div className="admin-overview-access-error" role="alert"><p>{authorizationError.status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." : "Bạn không có quyền xem thống kê quản trị."}</p><a className="admin-outline" href={authorizationError.status === 401 ? "/login" : "/home"}>{authorizationError.status === 401 ? "Đăng nhập" : "Về trang chủ"}</a></div>
    </section>;

    return <section className="admin-screen admin-overview">
        <AdminHeading title="Tổng quan" description="Theo dõi đăng ký mới, tình trạng quán ăn và bài đăng mới." />
        <div className="admin-dashboard-top">
            <section className="admin-dashboard-panel" aria-labelledby="overview-users-title" aria-busy={users.loading}>
                <div className="admin-panel-heading"><ChartNoAxesCombined className="admin-panel-icon blue" aria-hidden="true" /><div className="admin-panel-titles"><h2 id="overview-users-title">Người dùng</h2><p>Đăng ký mới theo thời gian</p></div><div className="admin-overview-controls"><DayFilter value={userDays} onChange={setUserDays} label="Khoảng thời gian người dùng" /><ReloadButton request={users} label="Tải lại thống kê người dùng" /></div></div>
                <StatisticContent request={users}>{(data) => <>
                    <SeriesSummary data={data.series} total={data.total} unit="người dùng mới" />
                    <TimeSeriesChart data={data.series} label={`Người dùng đăng ký mới trong ${userDays} ngày qua`} />
                    <div className="admin-chart-legend"><span><i />Đăng ký mới</span></div>
                </>}</StatisticContent>
            </section>
            <section className="admin-dashboard-panel" aria-labelledby="overview-status-title" aria-busy={statuses.loading}>
                <div className="admin-panel-heading"><Clock3 className="admin-panel-icon" aria-hidden="true" /><div className="admin-panel-titles"><h2 id="overview-status-title">Tình trạng quán ăn</h2><p>Tổng quán và số lượng theo trạng thái</p></div><ReloadButton request={statuses} label="Tải lại thống kê trạng thái quán ăn" /></div>
                <StatisticContent request={statuses}>{(data) => <StatusDonut counts={data.counts} total={data.total} />}</StatisticContent>
            </section>
        </div>
        <section className="admin-dashboard-panel admin-posts-panel" aria-labelledby="overview-posts-title" aria-busy={posts.loading}>
            <div className="admin-panel-heading"><ChartColumnIncreasing className="admin-panel-icon blue" aria-hidden="true" /><div className="admin-panel-titles"><h2 id="overview-posts-title">Bài đăng mới</h2><p>Số bài đăng được tạo theo ngày</p></div><div className="admin-overview-controls"><DayFilter value={postDays} onChange={setPostDays} label="Khoảng thời gian bài đăng" /><ReloadButton request={posts} label="Tải lại thống kê bài đăng" /></div></div>
            <StatisticContent request={posts}>{(data) => <>
                <SeriesSummary data={data.series} total={data.total} unit="bài đăng mới" />
                <TimeSeriesChart data={data.series} variant="bar" label={`Bài đăng mới trong ${postDays} ngày qua`} />
                {data.total === 0 && <p className="admin-chart-zero">Chưa có bài đăng mới trong khoảng thời gian này.</p>}
            </>}</StatisticContent>
        </section>
    </section>;
}

import { ArrowLeft } from "lucide-react";
import "./RouteStatus.css";

export function RouteStatus({ notFound = false }) {
    return <main className="route-status"><a className="route-status-brand" href="/home">Quán Ngon</a>{notFound ? <><h1>Không tìm thấy trang</h1><p>Đường dẫn này không tồn tại hoặc đã thay đổi.</p><a className="route-status-back" href="/home"><ArrowLeft aria-hidden="true" /> Về trang chủ</a></> : <p role="status">Đang tải...</p>}</main>;
}

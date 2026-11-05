import { useId } from "react";
import { createPortal } from "react-dom";
import "./PageLoadError.css";

export function PageLoadError({ onRetry = () => window.location.reload(), compact = false, fullPage = false,
    title = "Tạm thời không thể tải trang" }) {
    const titleId = useId();
    const standalone = fullPage || !compact;
    const Container = standalone ? "main" : "section";
    const Heading = standalone ? "h1" : "h2";

    const content = <Container className={`page-load-error${compact ? " page-load-error--compact" : ""}${standalone ? " page-load-error--full" : ""}`}
        role="alert" aria-labelledby={titleId}>
        <Heading id={titleId}>{title}</Heading>
        <p>Vui lòng thử lại sau.</p>
        <button type="button" className="page-load-error-retry" onClick={onRetry}>Thử lại</button>
    </Container>;

    return standalone ? createPortal(content, document.body) : content;
}

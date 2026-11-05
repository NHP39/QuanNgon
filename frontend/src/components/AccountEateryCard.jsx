import { useState } from "react";
import { Eye, EyeOff, Heart, MapPin, Pencil, Phone, Store, Trash2 } from "lucide-react";

import { EATERY_STATUS_LABELS } from "../data/eateryStatus";

export function AccountEateryPhoto({ src, alt }) {
    const [failedSrc, setFailedSrc] = useState(null);
    return !src || failedSrc === src
        ? <span className="account-photo-fallback" role="img" aria-label="Ảnh chưa khả dụng"><Store aria-hidden="true" /></span>
        : <img src={src} alt={alt} onError={() => setFailedSrc(src)} />;
}

export function AccountEateryCard({ eatery, owned = false, onRemove, onPreview, onDetails, onAction }) {
    const images = [eatery.thumbnailUrl, ...(eatery.galleryUrls || [])].filter(Boolean);
    const address = [eatery.street, eatery.ward, eatery.province].filter(Boolean).join(", ");

    return <article className={`account-eatery-card${owned ? " is-owned" : ""}`} aria-label={eatery.name}>
        {images.length ? <button type="button" className="account-eatery-cover" onClick={() => onPreview(images, 0)} aria-label={`Xem ảnh ${eatery.name}`}><AccountEateryPhoto src={eatery.thumbnailUrl || images[0]} alt={eatery.name} /></button> : <div className="account-eatery-cover account-eatery-no-photo"><Store aria-hidden="true" /></div>}
        <div className="account-eatery-body">
            <div className="account-eatery-top"><div className="account-eatery-title"><h3>{eatery.name}</h3>{owned && <span className={`account-status is-${eatery.status?.toLowerCase() || "pending"}`}>{EATERY_STATUS_LABELS[eatery.status] || eatery.status}</span>}</div>{!owned && <div className="account-eatery-actions"><button type="button" onClick={() => onRemove(eatery.id)}><Heart aria-hidden="true" />Bỏ yêu thích</button><a href={`/eateries/${eatery.detailId || eatery.id}`}>Xem chi tiết</a></div>}</div>
            <div className="account-eatery-meta"><span>{eatery.category}</span>{address && <span><MapPin aria-hidden="true" />{address}</span>}{eatery.phoneContact && <span><Phone aria-hidden="true" />{eatery.phoneContact}</span>}</div>
            <p>{eatery.content}</p>
            {owned && eatery.status === "REJECTED" && eatery.rejectionReason && <p className="account-rejection-reason"><strong>Lý do từ chối:</strong> {eatery.rejectionReason}</p>}
            {images.length > 1 && <div className="account-eatery-gallery">{images.slice(0, 4).map((url, index) => <button type="button" key={`${url}-${index}`} onClick={() => onPreview(images, index)} aria-label={`Xem ảnh ${index + 1} của ${eatery.name}`}><AccountEateryPhoto src={url} alt="" /></button>)}{images.length > 4 && <button type="button" className="account-gallery-more" onClick={() => onPreview(images, 4)}>+{images.length - 4}</button>}</div>}
        </div>
        {owned && <div className="account-eatery-actions account-owned-actions" role="group" aria-label={`Thao tác với ${eatery.name}`}>
            {eatery.status === "PENDING" && <a className="account-action-primary" href={`/account/eateries/${encodeURIComponent(eatery.id)}/edit`}><Pencil aria-hidden="true" />Chỉnh sửa</a>}
            {eatery.status === "APPROVED" && <button type="button" className="account-action-primary" onClick={() => onAction("hide", eatery)}><EyeOff aria-hidden="true" />Ẩn quán</button>}
            {eatery.status === "HIDDEN" && <button type="button" className="account-action-primary" onClick={() => onAction("unhide", eatery)}><Eye aria-hidden="true" />Bỏ ẩn</button>}
            <button type="button" onClick={() => onDetails(eatery)}><Eye aria-hidden="true" />Xem chi tiết</button>
            <button type="button" className="account-delete-link" onClick={() => onAction("delete", eatery)}><Trash2 aria-hidden="true" />Xóa</button>
        </div>}
    </article>;
}

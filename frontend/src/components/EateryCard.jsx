import { useState } from "react";
import { Heart, MapPin, Star, Store } from "lucide-react";
import "./EateryCard.css";

export function EateryCard({ eatery, favorite, onFavorite, canFavorite, favoritePending = false }) {
    const [failedImage, setFailedImage] = useState(null);
    const location = [eatery.location?.trim(), eatery.province?.trim()].filter(Boolean).join(", ") || "Chưa cập nhật địa chỉ";
    const favoriteButton = canFavorite && <button type="button" className={`explore-favorite ${favorite ? "is-favorite" : ""}`} title={favoritePending ? "Đang cập nhật..." : favorite ? "Bỏ yêu thích" : "Yêu thích"} aria-label={`${favorite ? "Bỏ yêu thích" : "Yêu thích"} ${eatery.name}`} aria-pressed={favorite} disabled={favoritePending} aria-busy={favoritePending} onClick={() => onFavorite(eatery.id, favorite)}>
        <Heart aria-hidden="true" />
    </button>;

    return (
        <article className="explore-card">
            <a className="explore-card-link" href={`/eateries/${eatery.id}`} aria-label={`Xem chi tiết ${eatery.name}`} />
            <div className="explore-card-image">
                {!eatery.image || failedImage === eatery.image
                    ? <span className="explore-card-image-fallback" role="img" aria-label={`Ảnh ${eatery.name} chưa khả dụng`}><Store aria-hidden="true" /></span>
                    : <img src={eatery.image} alt={eatery.name} loading="lazy" onError={() => setFailedImage(eatery.image)} />}
            </div>
            <div className="explore-card-body">
                <div className="eatery-card-heading"><h3 className="explore-card-name" title={eatery.name}>{eatery.name}</h3>{favoriteButton}</div>
                <div className={`explore-rating${eatery.reviewCount === 0 ? " is-unrated" : ""}`}>
                    {eatery.reviewCount === 0 ? "Chưa có đánh giá" : <><Star aria-hidden="true" /><span>{eatery.rating.toFixed(1)}</span><span className="explore-review-count">({eatery.reviewCount} đánh giá)</span></>}
                </div>
                <div className="eatery-card-meta">
                    <span className="explore-category">{eatery.category}</span>
                    <p className="explore-location"><MapPin aria-hidden="true" /><span>{location}</span></p>
                </div>
            </div>
        </article>
    );
}

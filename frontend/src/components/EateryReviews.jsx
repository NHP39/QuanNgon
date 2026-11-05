import { useState } from "react";
import { Check, ChevronDown, LoaderCircle, Pencil, PenLine, RotateCcw, Trash2 } from "lucide-react";
import { useEateryReviews } from "../hooks/useEateryReviews";
import { canUseMemberFeatures } from "../utils/permissions";
import { EateryPhoto, EateryPhotoLightbox } from "./EateryPhotoGallery";
import { RatingCriteriaRows, RatingStars } from "./EateryRating";
import { ReviewForm } from "./ReviewForm";
import { DeleteReviewDialog } from "./DeleteReviewDialog";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "numeric", year: "numeric" });

function ReviewCard({ review, own = false, onEdit, onDelete }) {
    const [photoIndex, setPhotoIndex] = useState(null);
    const initials = review.author.fullName.trim().split(/\s+/).slice(-2).map((word) => word[0]).join("").toUpperCase();
    return <article id={`review-${review.id}`} className={`detail-review-card${own ? " is-own-review" : ""}`} aria-label={own ? "Đánh giá của bạn" : `Đánh giá của ${review.author.fullName}`}>
        <div className="detail-review-card-heading">
            <div className="detail-review-author"><span className="detail-avatar" aria-hidden="true">{initials}</span><div><strong>{review.author.fullName}</strong><time dateTime={review.createdAt}>{dateFormatter.format(new Date(review.createdAt))}</time></div></div>
            {own && <div className="detail-review-own-tools"><span className="detail-own-badge">Đánh giá của bạn</span><div>
                <button type="button" className="detail-review-icon" disabled={!onEdit} aria-label="Chỉnh sửa đánh giá của bạn" onClick={onEdit}><Pencil aria-hidden="true" /></button>
                <button type="button" className="detail-review-icon" disabled={!onDelete} aria-label="Xóa đánh giá của bạn" onClick={onDelete}><Trash2 aria-hidden="true" /></button>
            </div></div>}
        </div>
        <div className="detail-review-rating"><RatingStars score={review.averageRating} /><strong>{review.averageRating.toFixed(1)}</strong></div>
        <RatingCriteriaRows scores={review} compact />
        <p className="detail-review-text">{review.content}</p>
        {review.images.length > 0 && <div className="detail-review-photos">{review.images.map((image, index) => <button key={`${image.id}:${image.imageUrl}`} type="button" aria-label={`Xem ảnh ${index + 1} trong đánh giá của ${review.author.fullName}`} onClick={() => setPhotoIndex(index)}><EateryPhoto image={image} name={`Đánh giá của ${review.author.fullName}`} index={index} /></button>)}</div>}
        {photoIndex !== null && <EateryPhotoLightbox images={review.images} name={`Đánh giá của ${review.author.fullName}`} initialIndex={photoIndex} onClose={() => setPhotoIndex(null)} />}
    </article>;
}

export function EateryReviews({ eatery, user, onRetrySession, onReviewChanged }) {
    const [reviewAction, setReviewAction] = useState(null);
    const [notice, setNotice] = useState("");
    const { items, loading, error, hasMore, totalElements, currentUserReview, ownLoading, ownError, needsSessionCheck,
        sort, loadMore, retryList, changeSort, retryOwn, refreshReviews } = useEateryReviews(eatery.id, user);
    const unavailable = error?.status === 404 || ownError?.status === 404;
    const hasReviews = eatery.reviewCount > 0;
    function refreshAfterWrite(message) {
        setReviewAction(null);
        setNotice(message);
        refreshReviews();
        onReviewChanged?.();
    }
    return <section className="detail-reviews" aria-labelledby="detail-reviews-title">
        <div className="detail-reviews-heading">{!user ? <a className="detail-write-button" href="/login" style={{ textDecoration: "none" }}><PenLine aria-hidden="true" />Đăng nhập để đánh giá</a>
            : canUseMemberFeatures(user) && <button type="button" className="detail-write-button" disabled={ownLoading || !!ownError || needsSessionCheck || unavailable || !!currentUserReview} title={currentUserReview ? "Bạn đã đánh giá quán này." : undefined} onClick={() => { setNotice(""); setReviewAction({ type: "create" }); }}>{currentUserReview ? <Check aria-hidden="true" /> : <PenLine aria-hidden="true" />}{currentUserReview ? "Đã đánh giá" : "Viết đánh giá"}</button>}</div>
        {notice && <p className="detail-review-notice" role="status">{notice}</p>}
        {reviewAction?.type === "delete" && <DeleteReviewDialog eatery={eatery} onClose={() => setReviewAction(null)}
            onDeleted={() => refreshAfterWrite("Xóa đánh giá thành công.")}
            onRefreshReview={() => refreshAfterWrite("Đã yêu cầu tải lại đánh giá của bạn.")}
            onRetrySession={() => { setReviewAction(null); onRetrySession(); }} />}
        {reviewAction && reviewAction.type !== "delete" && <ReviewForm eatery={eatery} user={user} initialReview={reviewAction.review} onClose={() => setReviewAction(null)}
            onSaved={() => refreshAfterWrite(reviewAction.type === "edit" ? "Cập nhật đánh giá thành công." : "Gửi đánh giá thành công.")}
            onRefreshReview={() => refreshAfterWrite("Đã yêu cầu tải lại đánh giá của bạn.")}
            onRetrySession={() => { setReviewAction(null); onRetrySession(); }} />}
        <div className="detail-reviews-layout">
            <div className="detail-rating-column">
                <div className="detail-rating-heading"><h2 id="detail-reviews-title">Đánh giá{hasReviews && ` (${eatery.reviewCount})`}</h2></div>
                <aside className="detail-rating-summary" aria-label="Điểm đánh giá trung bình"><span>Đánh giá tổng quan</span>
                    {hasReviews ? <><strong className="detail-rating-number">{eatery.averageRating.toFixed(1)}</strong><RatingStars score={eatery.averageRating} /><small>{eatery.reviewCount} đánh giá</small><RatingCriteriaRows scores={eatery.criteriaAverages} /></>
                        : <p className="detail-rating-empty">Chưa có đánh giá</p>}
                </aside>
            </div>
            <div className="detail-review-list">
                <div className="detail-review-list-heading"><h3>Danh sách đánh giá</h3><label>Sắp xếp<select aria-label="Sắp xếp đánh giá" value={sort} disabled={needsSessionCheck || unavailable} onChange={(event) => changeSort(event.target.value)}><option value="newest">Mới nhất</option><option value="highest">Điểm cao nhất</option><option value="lowest">Điểm thấp nhất</option></select></label></div>
                {unavailable ? <div className="detail-review-feedback" role="alert"><p>Quán không tồn tại hoặc hiện không được công khai.</p><a href="/explore">Quay lại Khám phá</a></div> : <>
                    {needsSessionCheck && <div className="detail-review-feedback" role="alert"><p>Phiên đăng nhập đã thay đổi. Vui lòng kiểm tra lại để tải đánh giá.</p><button type="button" onClick={onRetrySession}><RotateCcw aria-hidden="true" />Kiểm tra lại phiên</button><a href="/login">Đăng nhập</a></div>}
                    {ownLoading && <p className="detail-review-loading" role="status">Đang tải đánh giá của bạn...</p>}
                    {ownError && !needsSessionCheck && <div className="detail-review-feedback" role="alert"><p>Không tải được đánh giá của bạn. {ownError.message}</p><button type="button" onClick={retryOwn}><RotateCcw aria-hidden="true" />Thử lại đánh giá của bạn</button></div>}
                    {currentUserReview && !needsSessionCheck && <ReviewCard key={`own-${currentUserReview.id}:${currentUserReview.createdAt}`} review={currentUserReview} own
                        onEdit={!ownLoading && !ownError ? () => { setNotice(""); setReviewAction({ type: "edit", review: currentUserReview }); } : undefined}
                        onDelete={!ownLoading && !ownError ? () => { setNotice(""); setReviewAction({ type: "delete" }); } : undefined} />}
                    <div className="detail-other-reviews" aria-busy={loading}>
                        {items.map((review) => <ReviewCard key={review.id} review={review} />)}
                        {loading && <p className="detail-review-loading" role="status"><LoaderCircle aria-hidden="true" />Đang tải đánh giá...</p>}
                        {error && !needsSessionCheck && <div className="detail-review-feedback" role="alert"><p>Không tải được danh sách đánh giá. {error.message}</p><button type="button" onClick={retryList}><RotateCcw aria-hidden="true" />Thử lại danh sách đánh giá</button></div>}
                        {!loading && !error && !items.length && <div className="detail-reviews-pending"><p>{user ? "Chưa có đánh giá khác." : "Quán chưa có đánh giá."}</p></div>}
                    </div>
                    {items.length > 0 && <p className="detail-review-count" role="status">Đã hiển thị {items.length}/{totalElements} đánh giá{user ? " khác" : ""}</p>}
                    {hasMore && !error && !needsSessionCheck && <button type="button" className="detail-load-more" disabled={loading} onClick={loadMore}>{loading ? <LoaderCircle aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}{loading ? "Đang tải..." : "Xem thêm"}</button>}
                </>}
            </div>
        </div>
    </section>;
}

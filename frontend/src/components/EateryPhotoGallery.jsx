import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";

export function EateryPhoto({ image, name, index, lazy = true }) {
    const [failed, setFailed] = useState(false);
    return <span className="detail-photo-art">
        {failed ? <span className="detail-photo-fallback" role="img" aria-label="Ảnh chưa khả dụng"><ImageOff aria-hidden="true" /></span>
            : <img src={image.imageUrl} alt={`${name} - Ảnh ${index + 1}`} loading={lazy ? "lazy" : "eager"} onError={() => setFailed(true)} />}
    </span>;
}

export function EateryPhotoLightbox({ images, name, initialIndex, onClose }) {
    const [index, setIndex] = useState(initialIndex);
    const dialog = useRef(null);
    const closeButton = useRef(null);

    useEffect(() => {
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeButton.current?.focus();
        return () => {
            document.body.style.overflow = previousOverflow;
            if (previousFocus?.isConnected) previousFocus.focus?.();
        };
    }, []);

    function handleKeyDown(event) {
        if (event.key === "Escape") { event.stopPropagation(); onClose(); }
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            setIndex((current) => (current + (event.key === "ArrowLeft" ? -1 : 1) + images.length) % images.length);
        }
        if (event.key !== "Tab") return;
        const buttons = [...dialog.current.querySelectorAll("button")];
        const first = buttons[0];
        const last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    return <div className="detail-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={handleKeyDown}>
        <section ref={dialog} className="detail-lightbox" role="dialog" aria-modal="true" aria-label={`Hình ảnh ${name}`}>
            <div className="detail-lightbox-top"><span aria-live="polite">{index + 1} / {images.length}</span><button ref={closeButton} type="button" title="Đóng" aria-label="Đóng ảnh" onClick={onClose}><X aria-hidden="true" /></button></div>
            <div className="detail-lightbox-stage">
                {images.length > 1 && <button type="button" title="Ảnh trước" aria-label="Ảnh trước" onClick={() => setIndex((current) => (current - 1 + images.length) % images.length)}><ChevronLeft aria-hidden="true" /></button>}
                <div className="detail-lightbox-image"><EateryPhoto key={images[index].id} image={images[index]} name={name} index={index} lazy={false} /></div>
                {images.length > 1 && <button type="button" title="Ảnh sau" aria-label="Ảnh sau" onClick={() => setIndex((current) => (current + 1) % images.length)}><ChevronRight aria-hidden="true" /></button>}
            </div>
        </section>
    </div>;
}

export function EateryPhotoGallery({ images, name }) {
    const [featuredPhoto, setFeaturedPhoto] = useState(0);
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const thumbnails = useRef(null);

    useEffect(() => {
        const strip = thumbnails.current;
        const selected = strip?.children[featuredPhoto];
        if (!selected) return;
        const stripBounds = strip.getBoundingClientRect();
        const selectedBounds = selected.getBoundingClientRect();
        if (selectedBounds.left < stripBounds.left) strip.scrollBy({ left: selectedBounds.left - stripBounds.left });
        else if (selectedBounds.right > stripBounds.right) strip.scrollBy({ left: selectedBounds.right - stripBounds.right });
    }, [featuredPhoto]);

    if (!images.length) return <section className="detail-gallery-empty" aria-label="Hình ảnh quán ăn"><ImageOff aria-hidden="true" /><span>Quán chưa có hình ảnh.</span></section>;

    return <>
        <section className="detail-gallery" aria-label={`Hình ảnh ${name}`}>
            <div className="detail-gallery-stage">
                <button type="button" className="detail-gallery-featured" aria-label={`Phóng to ảnh ${featuredPhoto + 1} của ${name}`} onClick={() => setLightboxIndex(featuredPhoto)}>
                    <EateryPhoto key={images[featuredPhoto].id} image={images[featuredPhoto]} name={name} index={featuredPhoto} lazy={false} />
                </button>
                {images.length > 1 && <>
                    <div className="detail-gallery-controls">
                        <button type="button" title="Ảnh trước" aria-label="Ảnh trước" onClick={() => setFeaturedPhoto((current) => (current - 1 + images.length) % images.length)}><ChevronLeft aria-hidden="true" /></button>
                        <button type="button" title="Ảnh sau" aria-label="Ảnh sau" onClick={() => setFeaturedPhoto((current) => (current + 1) % images.length)}><ChevronRight aria-hidden="true" /></button>
                    </div>
                    <span className="detail-gallery-counter" aria-live="polite" aria-atomic="true">{featuredPhoto + 1} / {images.length}</span>
                </>}
            </div>
            {images.length > 1 && <div ref={thumbnails} className="detail-gallery-thumbnails" role="group" aria-label="Chọn ảnh để xem">
                {images.map((image, index) => <button key={image.id} type="button" className={`detail-gallery-thumbnail${index === featuredPhoto ? " is-selected" : ""}`}
                    aria-label={`Hiển thị ảnh ${index + 1} của ${name}`} aria-pressed={index === featuredPhoto} onClick={() => setFeaturedPhoto(index)}>
                    <EateryPhoto image={image} name={name} index={index} />
                </button>)}
            </div>}
        </section>
        {lightboxIndex !== null && <EateryPhotoLightbox images={images} name={name} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />}
    </>;
}

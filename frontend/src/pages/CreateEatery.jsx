import { isConnectionError, getApiErrorMessage } from "../services/apiClient";
import { PageLoadError } from "../components/PageLoadError";
import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Eye, Image as ImageIcon, Lightbulb, LockKeyhole, MapPin, Phone, Plus, Send, Store, X } from "lucide-react";
import { loadCurrentUser, logout } from "../services/authService";
import { createEatery, getCategories } from "../services/eateryService";
import { UserFooter, UserHeader } from "../components/UserLayout";
import { AddressFields } from "../components/AddressFields";
import { canUseMemberFeatures } from "../utils/permissions";
import { getImageError, prepareEateryImage } from "../utils/eateryImages";
import "./CreateEatery.css";

const EMPTY_FORM = {
    name: "", phoneContact: "", categoryId: "", content: "",
    street: "", ward: "", province: ""
};

function CreateEatery() {
    const pageRef = useRef(null);
    const thumbnailInput = useRef(null);
    const galleryInput = useRef(null);
    const previewUrls = useRef(new Set());
    const mounted = useRef(false);
    const imageSelectionBusy = useRef(false);
    const [session, setSession] = useState({ loading: true, user: null, error: "" });
    const [categories, setCategories] = useState([]);
    const [categoryLoading, setCategoryLoading] = useState(true);
    const [categoryError, setCategoryError] = useState("");
    const [form, setForm] = useState(EMPTY_FORM);
    const [thumbnail, setThumbnail] = useState(null);
    const [gallery, setGallery] = useState([]);
    const [thumbnailUrl, setThumbnailUrl] = useState("");
    const [galleryUrls, setGalleryUrls] = useState([]);
    const [error, setError] = useState("");
    const [created, setCreated] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [processingImages, setProcessingImages] = useState(false);

    useEffect(() => {
        let active = true;
        loadCurrentUser()
            .then((user) => {
                if (active) setSession({ loading: false, user, error: "" });
            })
            .catch((failure) => {
                if (active) setSession({
                    loading: false, user: null, error: failure
                });
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        getCategories()
            .then((data) => {
                if (active) {
                    setCategories(data);
                    setCategoryError("");
                }
            })
            .catch((err) => { if (active) setCategoryError(err); })
            .finally(() => { if (active) setCategoryLoading(false); });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        mounted.current = true;
        const urls = previewUrls.current;
        return () => {
            mounted.current = false;
            urls.forEach((url) => URL.revokeObjectURL(url));
            urls.clear();
        };
    }, []);

    const selectedCategory = categories.find((item) => String(item.id) === form.categoryId);
    const address = [form.street, form.ward, form.province].filter(Boolean).join(", ");

    function updateForm(key, value) {
        setForm((current) => ({ ...current, [key]: value }));
        setError("");
    }

    function updateAddress(values) {
        setForm((current) => ({ ...current, ...values }));
        setError("");
    }

    async function retryCategories() {
        setCategoryLoading(true);
        setCategoryError("");
        try {
            setCategories(await getCategories());
        } catch (err) {
            setCategoryError(err);
        } finally {
            setCategoryLoading(false);
        }
    }

    async function chooseImages(event, isGallery = false) {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        if (!files.length || imageSelectionBusy.current || submitting) return;
        if (isGallery && gallery.length + files.length > 6) return setError("Ảnh của quán chỉ được tối đa 6 ảnh.");
        const problem = files.map(getImageError).find(Boolean);
        if (problem) return setError(problem);
        imageSelectionBusy.current = true;
        setProcessingImages(true);
        setError("");
        try {
            const prepared = [];
            for (const file of files) {
                prepared.push(await prepareEateryImage(file));
                if (!mounted.current) return;
            }
            const urls = prepared.map((file) => URL.createObjectURL(file));
            urls.forEach((url) => previewUrls.current.add(url));
            if (isGallery) {
                setGallery((current) => [...current, ...prepared]);
                setGalleryUrls((current) => [...current, ...urls]);
            } else {
                if (thumbnailUrl) {
                    URL.revokeObjectURL(thumbnailUrl);
                    previewUrls.current.delete(thumbnailUrl);
                }
                setThumbnail(prepared[0]);
                setThumbnailUrl(urls[0]);
            }
        } catch (failure) {
            if (mounted.current) setError(failure.message || "Không xử lý được ảnh. Vui lòng chọn lại.");
        } finally {
            imageSelectionBusy.current = false;
            if (mounted.current) setProcessingImages(false);
        }
    }

    function removeThumbnail() {
        if (imageSelectionBusy.current || submitting) return;
        URL.revokeObjectURL(thumbnailUrl);
        previewUrls.current.delete(thumbnailUrl);
        setThumbnail(null);
        setThumbnailUrl("");
    }

    function removeGallery(index) {
        if (imageSelectionBusy.current || submitting) return;
        const url = galleryUrls[index];
        URL.revokeObjectURL(url);
        previewUrls.current.delete(url);
        setGallery(gallery.filter((_, i) => i !== index));
        setGalleryUrls(galleryUrls.filter((_, i) => i !== index));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (imageSelectionBusy.current || submitting) return;
        setError("");
        if (!thumbnail) return setError("Vui lòng chọn ảnh đại diện.");
        if (!form.categoryId) return setError("Vui lòng chọn danh mục.");
        if ([form.province, form.ward, form.street].some((part) => !part.trim())) {
            return setError("Vui lòng nhập đầy đủ địa chỉ quán.");
        }

        const data = {
            name: form.name.trim(),
            phoneContact: form.phoneContact.trim(),
            categoryId: Number(form.categoryId),
            content: form.content.trim(),
            address: {
                street: form.street.trim(),
                ward: form.ward.trim(),
                province: form.province.trim()
            }
        };

        setSubmitting(true);
        try {
            const result = await createEatery(data, thumbnail, gallery);
            setCreated(result);
            pageRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleLogout() {
        try {
            await logout();
            window.location.replace("/login");
        } catch (err) {
            setError(getApiErrorMessage(err));
        }
    }

    if (session.loading) {
        return <main className="ce-page"><div className="ce-gate">Đang kiểm tra đăng nhập...</div></main>;
    }

    if (session.error || !canUseMemberFeatures(session.user)) {
        if (isConnectionError(session.error)) return <PageLoadError fullPage />;
        return (
            <main className="ce-page">
                <div className="ce-gate">
                    <LockKeyhole aria-hidden="true" />
                    <h1>Không thể đăng quán</h1>
                    <p>{session.error ? "Bạn cần đăng nhập để đăng quán." : "Đăng nhập bằng tài khoản thành viên hoặc quản trị viên để đăng quán."}</p>
                    <a href="/login">Về trang đăng nhập</a>
                </div>
            </main>
        );
    }

    return (
        <div className="ce-page" ref={pageRef}>
            <UserHeader active="post" user={session.user} onLogout={handleLogout} />

            <main className="ce-main">
                <div className="ce-heading">
                    <h1>Chia sẻ <em>Quán ăn</em> mới</h1>
                    <p>Chia sẻ địa điểm ăn uống bạn yêu thích với cộng đồng Quán Ngon.</p>
                </div>

                {created && (
                    <div className="ce-success" role="status">
                        <CheckCircle2 aria-hidden="true" />
                        <span><strong>{created.name}</strong> đã được gửi và đang chờ duyệt.</span>
                        <button type="button" onClick={() => window.location.reload()}>Đăng quán khác</button>
                    </div>
                )}

                <div className="ce-columns">
                    <form className="ce-form-panel" onSubmit={handleSubmit}>
                        <section className="ce-section">
                            <h2><Store aria-hidden="true" /> Thông tin quán ăn</h2>

                            <label className="ce-field">
                                <span>Tên quán <b>*</b></span>
                                <input value={form.name} onChange={(event) => updateForm("name", event.target.value)}
                                       placeholder="Nhập tên quán ăn" maxLength={100} required />
                                <small className="ce-counter">{form.name.length}/100</small>
                            </label>

                            <div className="ce-row ce-row-two">
                                <label className="ce-field">
                                    <span>Số điện thoại <b>*</b></span>
                                    <input type="tel" inputMode="tel" value={form.phoneContact}
                                           onChange={(event) => updateForm("phoneContact", event.target.value)}
                                           placeholder="Ví dụ: 0901234567" pattern="(0|\+84)[0-9]{9,10}"
                                           title="Bắt đầu bằng 0 hoặc +84, theo sau là 9-10 chữ số" required />
                                </label>
                                <label className="ce-field">
                                    <span>Danh mục <b>*</b></span>
                                    <select value={form.categoryId} onChange={(event) => updateForm("categoryId", event.target.value)}
                                            disabled={categoryLoading || !!categoryError || categories.length === 0} required>
                                        <option value="">{categoryLoading ? "Đang tải danh mục..." : "Chọn danh mục"}</option>
                                        {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                    </select>
                                </label>
                            </div>

                            {categoryError && (
                                <p className="ce-category-error" role="alert">
                                    Không tải được danh mục. <button type="button" onClick={retryCategories}>Thử lại</button>
                                </p>
                            )}
                            {!categoryLoading && !categoryError && categories.length === 0 && (
                                <p className="ce-category-error">Chưa có danh mục nào để chọn.</p>
                            )}

                            <label className="ce-field">
                                <span>Mô tả quán <b>*</b></span>
                                <textarea value={form.content} onChange={(event) => updateForm("content", event.target.value)}
                                          placeholder="Món ăn đặc trưng, không gian, giá cả..."
                                          minLength={10} maxLength={2000} required />
                                <small className="ce-counter">{form.content.length}/2000</small>
                            </label>
                        </section>

                        <section className="ce-section">
                            <h2><MapPin aria-hidden="true" /> Địa chỉ quán <b>*</b></h2>
                            <AddressFields value={form} onChange={updateAddress} disabled={submitting} />
                        </section>

                        <section className="ce-section">
                            <h2><Camera aria-hidden="true" /> Hình ảnh</h2>
                            <div className="ce-images-row">
                                <div className="ce-image-group">
                                    <div className="ce-image-heading"><span className="ce-image-label">Ảnh đại diện <b>*</b></span><small>JPG, PNG, WEBP · tối đa 2 MB</small></div>
                                    <input ref={thumbnailInput} type="file" accept="image/jpeg,image/png,image/webp"
                                           onChange={(event) => chooseImages(event)} disabled={processingImages || submitting} hidden />
                                    <div className="ce-thumbnail-wrap">
                                        <button type="button" className="ce-thumbnail-picker"
                                                onClick={() => thumbnailInput.current?.click()} disabled={processingImages || submitting} title="Chọn ảnh đại diện">
                                            {thumbnailUrl ? <img src={thumbnailUrl} alt="Ảnh đại diện đã chọn" /> : (
                                                <span><ImageIcon aria-hidden="true" /><br />Nhấn để tải ảnh lên</span>
                                            )}
                                        </button>
                                        {thumbnail && <button type="button" className="ce-remove-thumb" title="Xóa ảnh đại diện"
                                                              disabled={processingImages || submitting} onClick={removeThumbnail}><X aria-hidden="true" /></button>}
                                    </div>
                                </div>
                                <div className="ce-image-group ce-gallery-group">
                                    <div className="ce-image-heading"><span className="ce-image-label">Ảnh của quán ({gallery.length}/6)</span><small>JPG, PNG, WEBP · tối đa 2 MB/ảnh</small></div>
                                    <input ref={galleryInput} type="file" accept="image/jpeg,image/png,image/webp"
                                           multiple onChange={(event) => chooseImages(event, true)} disabled={processingImages || submitting} hidden />
                                    <div className="ce-gallery-grid">
                                        {Array.from({ length: 6 }, (_, index) => (
                                            <div className="ce-gallery-slot" key={index}>
                                                {galleryUrls[index] ? (
                                                    <>
                                                        <img src={galleryUrls[index]} alt={`Ảnh của quán ${index + 1}`} />
                                                        <button type="button" title={`Xóa ảnh ${index + 1}`}
                                                                disabled={processingImages || submitting} onClick={() => removeGallery(index)}>
                                                            <X aria-hidden="true" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button type="button" className="ce-gallery-add" title="Thêm ảnh của quán"
                                                            onClick={() => galleryInput.current?.click()}
                                                            disabled={gallery.length >= 6 || processingImages || submitting}>
                                                        <Plus aria-hidden="true" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {processingImages && <p className="ce-image-status" role="status">Đang xử lý ảnh...</p>}
                        {error && <p className="ce-form-error" role="alert">{error}</p>}
                        <button className="ce-submit" type="submit"
                                disabled={submitting || processingImages || !!created || categoryLoading || !!categoryError || categories.length === 0}>
                            <Send aria-hidden="true" />
                            {submitting ? "Đang đăng bài..." : created ? "Đã gửi duyệt" : "Đăng bài"}
                        </button>
                    </form>

                    <aside className="ce-aside">
                        <section className="ce-preview-panel">
                            <h2><Eye aria-hidden="true" /> Xem trước</h2>
                            <div className="ce-preview-cover">
                                {thumbnailUrl ? <img src={thumbnailUrl} alt="Xem trước ảnh đại diện" /> : (
                                    <div className="ce-preview-empty"><ImageIcon aria-hidden="true" />Ảnh đại diện sẽ hiển thị ở đây</div>
                                )}
                                <span>{created ? "CHỜ DUYỆT" : "BẢN XEM TRƯỚC"}</span>
                            </div>
                            <h3>{form.name.trim() || "Tên quán ăn"}</h3>
                            <p className="ce-preview-category">{selectedCategory?.name || "Danh mục"}</p>
                            <p className="ce-preview-detail"><Phone aria-hidden="true" /> {form.phoneContact || "Số điện thoại"}</p>
                            <p className="ce-preview-detail"><MapPin aria-hidden="true" /> {address || "Địa chỉ quán"}</p>
                            <p className="ce-preview-description">{form.content.trim() || "Mô tả quán sẽ hiển thị ở đây."}</p>
                            {galleryUrls.length > 0 && <div className="ce-preview-gallery">
                                {galleryUrls.map((url, index) => <img src={url} alt={`Xem trước ảnh ${index + 1}`} key={url} />)}
                            </div>}
                        </section>

                        <section className="ce-tips-panel">
                            <h2><Lightbulb aria-hidden="true" /> Lưu ý khi đăng quán</h2>
                            <ul>
                                <li><CheckCircle2 aria-hidden="true" /> Ảnh rõ nét, mỗi ảnh tối đa 2 MB.</li>
                                <li><CheckCircle2 aria-hidden="true" /> Chọn đúng danh mục để mọi người dễ tìm.</li>
                                <li><CheckCircle2 aria-hidden="true" /> Ghi rõ địa chỉ và thông tin liên hệ.</li>
                                <li><CheckCircle2 aria-hidden="true" /> Bài đăng sẽ được quản trị viên xét duyệt.</li>
                            </ul>
                        </section>
                    </aside>
                </div>
            </main>

            <UserFooter />
        </div>
    );
}

export default CreateEatery;

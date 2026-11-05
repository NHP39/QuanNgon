import { isConnectionError } from "../services/apiClient";
import { PageLoadError } from "./PageLoadError";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, LoaderCircle, Plus, Store, X } from "lucide-react";
import { getCategories } from "../services/eateryService";
import { getMyEateryDetail, updateMyEatery } from "../services/userEateryService";
import { EATERY_STATUS_LABELS } from "../data/eateryStatus";
import { AccountEateryPhoto } from "./AccountEateryCard";
import { AddressFields } from "./AddressFields";
import { getImageError, prepareEateryImage } from "../utils/eateryImages";

export function AccountEditEateryPanel({ eateryId }) {
    const id = /^\d+$/.test(eateryId) ? Number(eateryId) : NaN;
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState({ id: null, attempt: -1, eatery: null, categories: [], error: null });

    useEffect(() => {
        const controller = new AbortController();
        Promise.all([getMyEateryDetail(id, { signal: controller.signal }), getCategories({ signal: controller.signal })])
            .then(([eatery, categories]) => {
                if (!controller.signal.aborted) setResult({ id, attempt, eatery, categories, error: null });
            }).catch((error) => {
                if (!controller.signal.aborted) setResult({ id, attempt, eatery: null, categories: [], error });
            });
        return () => controller.abort();
    }, [id, attempt]);

    const loading = !Object.is(result.id, id) || result.attempt !== attempt;
    const reload = () => setAttempt((current) => current + 1);
    if (loading) return <div className="account-loading" role="status">Đang tải thông tin quán...</div>;
    if (result.error) {
        if (isConnectionError(result.error)) return <PageLoadError onRetry={reload} />;
        const needsLogin = result.error.status === 401;
        return <div className="account-owned-error" role="alert"><p>{result.error.message}</p>
            {needsLogin ? <a className="account-outline" href="/login">Đăng nhập lại</a>
                : result.error.status === 404 ? <a className="account-outline" href="/account/eateries">Quay lại danh sách</a>
                    : <button type="button" className="account-outline" onClick={reload}>Thử lại</button>}</div>;
    }
    if (result.eatery.status !== "PENDING") return <div className="account-empty"><Store aria-hidden="true" />
        <strong>Chỉ được chỉnh sửa quán đang Chờ duyệt</strong><a href="/account/eateries">Quay lại danh sách</a></div>;
    return <EditEateryForm key={`${id}-${attempt}`} eatery={result.eatery} categories={result.categories} onReload={reload} />;
}

function EditEateryForm({ eatery, categories, onReload }) {
    const [form, setForm] = useState(() => ({ name: eatery.name, phoneContact: eatery.phoneContact,
        categoryId: String(eatery.categoryId), content: eatery.content, street: eatery.street, ward: eatery.ward, province: eatery.province }));
    const [removedIds, setRemovedIds] = useState([]);
    const [thumbnail, setThumbnail] = useState(null);
    const [gallery, setGallery] = useState([]);
    const [failure, setFailure] = useState(null);
    const [saving, setSaving] = useState(false);
    const [processingImages, setProcessingImages] = useState(false);
    const mounted = useRef(false);
    const submitting = useRef(false);
    const choosing = useRef(false);
    const previewUrls = useRef(new Set());
    const remainingGallery = eatery.images.filter((image) => image.type === "GALLERY" && !removedIds.includes(image.id));
    const needsLogin = failure?.status === 401;
    const needsRefresh = Boolean(failure && (!failure.status || failure.status >= 500 || [401, 403, 404, 409].includes(failure.status)));
    const busy = saving || processingImages;

    useEffect(() => {
        mounted.current = true;
        const urls = previewUrls.current;
        return () => {
            mounted.current = false;
            for (const url of urls) URL.revokeObjectURL(url);
            urls.clear();
        };
    }, []);

    function revoke(url) {
        if (url && previewUrls.current.delete(url)) URL.revokeObjectURL(url);
    }

    function update(key, value) {
        setForm((current) => ({ ...current, [key]: value }));
        if (!needsRefresh) setFailure(null);
    }

    function updateAddress(values) {
        setForm((current) => ({ ...current, ...values }));
        if (!needsRefresh) setFailure(null);
    }

    async function chooseImages(event, isGallery = false) {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        if (!files.length || choosing.current || submitting.current || needsRefresh) return;
        if (isGallery && remainingGallery.length + gallery.length + files.length > 6) {
            return setFailure(Object.assign(new Error("Ảnh của quán chỉ được tối đa 6 ảnh."), { status: 400 }));
        }
        const problem = files.map(getImageError).find(Boolean);
        if (problem) return setFailure(Object.assign(new Error(problem), { status: 400 }));
        choosing.current = true;
        setProcessingImages(true);
        if (!needsRefresh) setFailure(null);
        try {
            const prepared = [];
            for (const file of files) {
                prepared.push(await prepareEateryImage(file));
                if (!mounted.current) return;
            }
            const additions = prepared.map((file) => {
                const url = URL.createObjectURL(file);
                previewUrls.current.add(url);
                return { file, url };
            });
            if (isGallery) setGallery((current) => [...current, ...additions]);
            else { revoke(thumbnail?.url); setThumbnail(additions[0]); }
        } catch (error) {
            if (mounted.current && !needsRefresh) setFailure(Object.assign(error, { status: 400 }));
        } finally {
            choosing.current = false;
            if (mounted.current) setProcessingImages(false);
        }
    }

    async function submit(event) {
        event.preventDefault();
        if (submitting.current || choosing.current || needsRefresh || !categories.length) return;
        const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
        if (["name", "street", "ward", "province"].some((key) => !values[key])) {
            return setFailure(Object.assign(new Error("Vui lòng nhập đầy đủ tên quán và địa chỉ."), { status: 400 }));
        }
        if (!/^(0|\+84)[0-9]{9}$/.test(values.phoneContact)) {
            return setFailure(Object.assign(new Error("Số điện thoại không hợp lệ."), { status: 400 }));
        }
        if (values.content.length < 10 || values.content.length > 2000) {
            return setFailure(Object.assign(new Error("Nội dung phải từ 10 đến 2000 ký tự."), { status: 400 }));
        }
        submitting.current = true;
        setSaving(true);
        setFailure(null);
        try {
            await updateMyEatery(eatery.id, {
                name: values.name, phoneContact: values.phoneContact, categoryId: Number(values.categoryId), content: values.content,
                address: { street: values.street, ward: values.ward, province: values.province },
                version: eatery.version, removeImageIds: removedIds
            }, thumbnail?.file || null, gallery.map((image) => image.file));
            if (mounted.current) window.location.assign("/account/eateries");
        } catch (error) {
            if (mounted.current) setFailure(error);
        } finally {
            submitting.current = false;
            if (mounted.current) setSaving(false);
        }
    }

    return <section className="account-panel account-edit-panel" aria-labelledby="account-edit-heading">
        <a className="account-back" href="/account/eateries" aria-disabled={busy} onClick={(event) => { if (submitting.current || choosing.current) event.preventDefault(); }}><ArrowLeft aria-hidden="true" /> Quán ăn đã chia sẻ</a>
        <div className="account-panel-heading"><div><h2 id="account-edit-heading">Chỉnh sửa quán ăn</h2><p>{eatery.name}</p></div><span className="account-status is-pending">{EATERY_STATUS_LABELS.PENDING}</span></div>
        <form className="account-form" onSubmit={submit} aria-busy={busy}>
            <fieldset className="account-edit-fields" disabled={busy}>
                <div className="account-form-grid"><label><span>Tên quán *</span><input value={form.name} onChange={(event) => update("name", event.target.value)} maxLength={255} required /></label><label><span>Số điện thoại *</span><input type="tel" value={form.phoneContact} onChange={(event) => update("phoneContact", event.target.value)} maxLength={20} required /></label></div>
                <label><span>Danh mục *</span><select value={form.categoryId} onChange={(event) => update("categoryId", event.target.value)} required>
                    {!categories.some((category) => category.id === Number(form.categoryId)) && <option value="">Chọn danh mục</option>}
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select></label>
                <label><span>Mô tả quán *</span><textarea value={form.content} onChange={(event) => update("content", event.target.value)} minLength={10} maxLength={2000} rows={4} required /></label>
                <AddressFields value={form} onChange={updateAddress} disabled={busy} />
                <div className="account-images-heading"><h3>Hình ảnh</h3></div>
                <div className="account-image-edit">
                    <div className="account-edit-thumbnail"><div className="account-edit-image-heading"><span>Ảnh đại diện</span><small>JPG, PNG, WEBP · tối đa 2 MB</small></div><div className="account-edit-cover"><AccountEateryPhoto src={thumbnail?.url || eatery.thumbnailUrl} alt="Ảnh đại diện quán" /></div>
                        <label className="account-upload"><Camera aria-hidden="true" />Thay ảnh<input type="file" accept="image/jpeg,image/png,image/webp" disabled={needsRefresh} aria-label="Thay ảnh đại diện" onChange={(event) => chooseImages(event)} /></label>
                        {thumbnail && <button type="button" className="account-inline-toggle" disabled={needsRefresh} onClick={() => { revoke(thumbnail.url); setThumbnail(null); }}>Giữ ảnh cũ</button>}
                    </div>
                    <div><div className="account-edit-image-heading"><span>Ảnh của quán ({remainingGallery.length + gallery.length}/6)</span><small>JPG, PNG, WEBP · tối đa 2 MB/ảnh</small></div><div className="account-edit-gallery">
                        {remainingGallery.map((image, index) => <div key={image.id}><AccountEateryPhoto src={image.imageUrl} alt={`Ảnh của quán ${index + 1}`} /><button type="button" disabled={needsRefresh} aria-label={`Xóa ảnh của quán ${index + 1}`} onClick={() => setRemovedIds((current) => [...current, image.id])}><X aria-hidden="true" /></button></div>)}
                        {gallery.map((image, index) => <div key={image.url}><img src={image.url} alt={`Ảnh mới của quán ${index + 1}`} /><button type="button" disabled={needsRefresh} aria-label={`Xóa ảnh mới của quán ${index + 1}`} onClick={() => { revoke(image.url); setGallery((current) => current.filter((item) => item.url !== image.url)); }}><X aria-hidden="true" /></button></div>)}
                        {remainingGallery.length + gallery.length < 6 && <label className="account-gallery-add"><Plus aria-hidden="true" /><input type="file" accept="image/jpeg,image/png,image/webp" disabled={needsRefresh} multiple aria-label="Thêm ảnh của quán" onChange={(event) => chooseImages(event, true)} /></label>}
                    </div></div>
                </div>
            </fieldset>
            {processingImages && <p className="account-image-status" role="status">Đang xử lý ảnh...</p>}
            {!categories.length && <p className="account-form-error" role="alert">Chưa có danh mục để chọn. Vui lòng tải thông tin mới.</p>}
            {failure && <p className="account-form-error" role="alert">{failure.message}</p>}
            {needsRefresh && <p className="account-image-status">Thông tin đang nhập vẫn được giữ. Tải thông tin mới sẽ thay thế form hiện tại; vui lòng kiểm tra trước khi lưu lại.</p>}
            {needsLogin ? <a className="account-outline" href="/login">Đăng nhập lại</a> : (needsRefresh || !categories.length) && <button type="button" className="account-outline" onClick={onReload}>Tải thông tin mới</button>}
            <div className="account-form-actions"><a className="account-outline" href="/account/eateries" aria-disabled={busy} onClick={(event) => { if (submitting.current || choosing.current) event.preventDefault(); }}>Hủy</a><button type="submit" className="account-primary" disabled={busy || needsRefresh || !categories.length}>{saving && <LoaderCircle className="account-profile-spinner" aria-hidden="true" />}{saving ? "Đang lưu..." : "Lưu thay đổi"}</button></div>
        </form>
    </section>;
}

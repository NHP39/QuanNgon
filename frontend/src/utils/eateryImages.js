const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1200;
const BACKGROUND = "#edf2f6";

export function getImageError(file) {
    if (!file || file.size === 0) return "Ảnh không được để trống.";
    if (!IMAGE_TYPES.includes(file.type)) return "Chỉ nhận ảnh JPG, PNG hoặc WEBP.";
    if (file.size > MAX_FILE_SIZE) return "Mỗi ảnh phải nhỏ hơn hoặc bằng 2 MB.";
    return "";
}

function encodeJpeg(canvas, quality) {
    return new Promise((resolve, reject) => canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Không xử lý được ảnh. Vui lòng chọn lại.")),
        "image/jpeg", quality));
}

export async function prepareEateryImage(file) {
    const problem = getImageError(file);
    if (problem) throw new Error(problem);
    const sourceUrl = URL.createObjectURL(file);
    const canvas = document.createElement("canvas");
    try {
        const image = new Image();
        image.src = sourceUrl;
        await image.decode().catch(() => { throw new Error("Không đọc được ảnh. Vui lòng chọn lại."); });
        const { naturalWidth: width, naturalHeight: height } = image;
        if (!width || !height) throw new Error("Ảnh không có kích thước hợp lệ.");

        // Fit the complete image inside an exact 4:3 frame, without upscaling it.
        const scale = Math.min(1, MAX_WIDTH / width, MAX_HEIGHT / height);
        const drawWidth = width * scale;
        const drawHeight = height * scale;
        const frameUnit = Math.min(MAX_WIDTH / 4, MAX_HEIGHT / 3,
            Math.max(1, Math.ceil(Math.max(drawWidth / 4, drawHeight / 3))));
        canvas.width = frameUnit * 4;
        canvas.height = frameUnit * 3;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");
        context.fillStyle = BACKGROUND;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, (canvas.width - drawWidth) / 2, (canvas.height - drawHeight) / 2, drawWidth, drawHeight);

        let blob = await encodeJpeg(canvas, 0.9);
        for (const quality of [0.8, 0.7]) {
            if (blob.size <= MAX_FILE_SIZE) break;
            blob = await encodeJpeg(canvas, quality);
        }
        if (blob.size > MAX_FILE_SIZE) throw new Error("Ảnh sau xử lý vượt quá 2 MB. Vui lòng chọn ảnh nhỏ hơn.");
        const name = `${file.name.replace(/\.[^.]+$/, "") || "eatery"}.jpg`;
        return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
    } finally {
        URL.revokeObjectURL(sourceUrl);
        canvas.width = 0;
        canvas.height = 0;
    }
}

export function readImageDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Không đọc được ảnh. Vui lòng chọn lại."));
        reader.readAsDataURL(file);
    });
}

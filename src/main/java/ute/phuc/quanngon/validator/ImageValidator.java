package ute.phuc.quanngon.validator;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import ute.phuc.quanngon.exception.InvalidImageException;

import java.util.List;
import java.util.Set;

@Component
public class ImageValidator {

    private static final long MAX_FILE_SIZE = 2 * 1024 * 1024;

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    public void validateThumbnail(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidImageException("Ảnh thumbnail không được để trống");
        }

        validate(file);
    }

    public void validateGallery(List<MultipartFile> files) {

        // Gallery not required
        if (files == null || files.isEmpty()) {
            return;
        }

        if (files.size() > 6) {
            throw new InvalidImageException("Gallery chỉ được tối đa 6 ảnh");
        }

        files.forEach(this::validate);
    }

    public void validateReviewImages(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            return;
        }

        if (files.size() > 4) {
            throw new InvalidImageException("Đánh giá chỉ được tối đa 4 ảnh");
        }

        files.forEach(this::validate);
    }

    private void validate(MultipartFile file) {

        if (file.isEmpty()) {
            throw new InvalidImageException("Ảnh không được để trống");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new InvalidImageException("Kích thước ảnh không được vượt quá 2MB");
        }

        if (!ALLOWED_TYPES.contains(file.getContentType())) {
            throw new InvalidImageException("Chỉ chấp nhận ảnh JPG, JPEG hoặc WEBP");
        }
    }
}

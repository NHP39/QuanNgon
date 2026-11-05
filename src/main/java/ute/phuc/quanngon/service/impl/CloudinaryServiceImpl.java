package ute.phuc.quanngon.service.impl;

import com.cloudinary.Cloudinary;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import ute.phuc.quanngon.dto.CloudinaryUploadResult;
import ute.phuc.quanngon.service.CloudinaryService;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryServiceImpl implements CloudinaryService {

    private final Cloudinary cloudinary;

    @Override
    public CloudinaryUploadResult upload(MultipartFile file) {
        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    Map.of(
                            "folder", "quanngon",
                            "resource_type", "image"
                    )
            );

            String url = result.get("secure_url").toString();
            String publicId = result.get("public_id").toString();

            return new CloudinaryUploadResult(url, publicId);

        } catch (IOException e) {
            throw new RuntimeException("Không thể upload hình ảnh", e);
        }
    }

    @Override
    public void deleteUploadedImages(List<String> publicIds) {
        for (String publicId : publicIds) {
            try {
                cloudinary.uploader().destroy(publicId, Map.of());
            } catch (IOException | RuntimeException ex) {
                log.warn("Không thể xóa ảnh đã upload, publicId={}", publicId, ex);
            }
        }
    }

    @Override
    public void registerCommitCleanup(List<String> publicIds) {
        if (publicIds.isEmpty()) {
            return;
        }

        List<String> imagesToDelete = List.copyOf(publicIds);
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        deleteUploadedImages(imagesToDelete);
                    }
                }
        );
    }

    @Override
    public void registerRollbackCleanup(List<String> uploadedPublicIds) {
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        if (status == STATUS_ROLLED_BACK) {
                            deleteUploadedImages(uploadedPublicIds);
                        } else if (status == STATUS_UNKNOWN
                                && !uploadedPublicIds.isEmpty()) {
                            log.warn(
                                    "Không xác định được kết quả transaction, cần kiểm tra ảnh: {}",
                                    uploadedPublicIds
                            );
                        }
                    }
                }
        );
    }
}

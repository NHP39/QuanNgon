package ute.phuc.quanngon.service;

import org.springframework.web.multipart.MultipartFile;
import ute.phuc.quanngon.dto.CloudinaryUploadResult;

import java.util.List;

public interface CloudinaryService {
    CloudinaryUploadResult upload(MultipartFile file);

    void deleteUploadedImages(List<String> publicIds);

    void registerRollbackCleanup(List<String> uploadedPublicIds);

    void registerCommitCleanup(List<String> publicIds);
}

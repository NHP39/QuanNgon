package ute.phuc.quanngon.service;

import org.springframework.web.multipart.MultipartFile;
import ute.phuc.quanngon.dto.Request.CreateEateryRequest;
import ute.phuc.quanngon.dto.Request.UpdateEateryStatusRequest;
import ute.phuc.quanngon.dto.Request.UpdateMyEateryRequest;
import ute.phuc.quanngon.dto.Request.UpdateEateryVisibilityRequest;
import ute.phuc.quanngon.dto.Response.*;
import ute.phuc.quanngon.enums.EateryStatus;

import java.util.List;
import java.util.Map;

public interface EateryService {

    EateryDetailResponse getPublicEateryDetail(Long eateryId);

    // User : search, sort and filter eateries
    PageResponse<EateryCardResponse> getPublicEateries(String q, Long categoryId, String province, String sort, int page, int size, String viewerEmail);

    List<String> getPublicEateryProvinces();

    PageResponse<MyEateryResponse> getMyEateries(String ownerEmail, EateryStatus status, int page, int size);

    MyEateryResponse getMyEateryDetail(Long eateryId, String ownerEmail);

    MyEateryResponse updateMyEatery(
            Long eateryId,
            String ownerEmail,
            UpdateMyEateryRequest request,
            MultipartFile thumbnail,
            List<MultipartFile> gallery);

    MyEateryResponse updateMyEateryVisibility(
            Long eateryId,
            String ownerEmail,
            UpdateEateryVisibilityRequest request);

    void deleteMyEatery(Long eateryId, String ownerEmail);

    // Admin: get eateries by status
    AdminEateryPageResponse<AdminEateryResponse> getEateryByStatus(EateryStatus status, String q, int page, int size);

    Map<EateryStatus, Long> getEateryCountsByStatus();


    // Create Eatery
    EateryResponse createEatery(
            CreateEateryRequest request,
            MultipartFile thumbnail,
            List<MultipartFile> gallery,
            String email
    );

    //Admin: Change status of Eatery
    AdminEateryResponse updateEateryStatus(Long eateryId, UpdateEateryStatusRequest  request);
}

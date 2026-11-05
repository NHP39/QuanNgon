package ute.phuc.quanngon.service;

import org.springframework.security.core.Authentication;
import ute.phuc.quanngon.dto.Request.UpdateUserInfoRequest;
import ute.phuc.quanngon.dto.Request.UpdateUserStatusRequest;
import ute.phuc.quanngon.dto.Response.AdminUserPageResponse;
import ute.phuc.quanngon.dto.Response.AdminUserResponse;
import ute.phuc.quanngon.dto.Response.UpdateUserInfoResponse;

public interface UserService {

    UpdateUserInfoResponse updateUserInfo(Authentication authentication, UpdateUserInfoRequest request);

    // Admin: filter & search Users
    AdminUserPageResponse<AdminUserResponse> getAdminUsers(String q, Boolean active, String sortDir, int page, int size);

    // Admin: update User status
    AdminUserResponse updateUserStatus(Long userId, UpdateUserStatusRequest request);
}

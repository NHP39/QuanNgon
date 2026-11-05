package ute.phuc.quanngon.service.impl;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import ute.phuc.quanngon.dto.Request.UpdateUserInfoRequest;
import ute.phuc.quanngon.dto.Request.UpdateUserStatusRequest;
import ute.phuc.quanngon.dto.Response.AdminUserPageResponse;
import ute.phuc.quanngon.dto.Response.AdminUserResponse;
import ute.phuc.quanngon.dto.Response.AdminUserSummaryResponse;
import ute.phuc.quanngon.dto.Response.UpdateUserInfoResponse;
import ute.phuc.quanngon.entity.Account;
import ute.phuc.quanngon.entity.User;
import ute.phuc.quanngon.enums.Role;
import ute.phuc.quanngon.exception.ResourceNotFoundException;
import ute.phuc.quanngon.repository.AccountRepository;
import ute.phuc.quanngon.repository.AccountStatusCount;
import ute.phuc.quanngon.repository.RefreshTokenRepository;
import ute.phuc.quanngon.repository.UserRepository;
import ute.phuc.quanngon.service.UserService;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    @Override
    @Transactional
    public UpdateUserInfoResponse updateUserInfo(Authentication authentication, UpdateUserInfoRequest request) {
        // Tìm hồ sơ của tài khoản đang đăng nhập.
        User user = userRepository.findByAccountEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        // Cập nhật tên người dùng.
        user.setFullName(request.fullName().strip());
        User savedUser = userRepository.save(user);

        // Trả thông tin sau cập nhật.
        return new UpdateUserInfoResponse(
                savedUser.getFullName(),
                savedUser.getAccount().getEmail(),
                savedUser.getAccount().getRole());
    }

    @Override
    public AdminUserPageResponse<AdminUserResponse> getAdminUsers(String q, Boolean active, String sortDir, int page, int size) {
        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(Sort.Direction.DESC, "account.createdAt", "id")
                : Sort.by(Sort.Direction.ASC, "account.createdAt", "id");

        Pageable pageable = PageRequest.of(page, size, sort);

        String keyword =  ((q == null) || q.isBlank()) ? "" : q.strip();

        Page<User> pageUsers = userRepository.searchUsers(keyword, active, pageable);

        Page<AdminUserResponse> pageAdminUserResponse = pageUsers.map(this::toAdminUserResponse);

        AccountStatusCount countUserAccountSummary = accountRepository.countAccountActive();

        AdminUserSummaryResponse adminUserSummaryResponse =
                new AdminUserSummaryResponse(
                        countUserAccountSummary.getTotalAccounts(),
                        countUserAccountSummary.getActiveAccounts(),
                        countUserAccountSummary.getTotalAccounts() - countUserAccountSummary.getActiveAccounts());

        return new AdminUserPageResponse<>(
                pageAdminUserResponse.getContent(),
                pageAdminUserResponse.getNumber(),
                pageAdminUserResponse.getSize(),
                pageAdminUserResponse.getTotalElements(),
                pageAdminUserResponse.getTotalPages(),
                adminUserSummaryResponse
                );
    }

    @Override
    @Transactional
    public AdminUserResponse updateUserStatus(Long userId, UpdateUserStatusRequest request) {
        // Tìm người dùng.
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        // Kiểm tra tài khoản thuộc role USER.
        Account account = user.getAccount();
        if (account == null || account.getRole() != Role.USER) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng");
        }

        // Cập nhật trạng thái tài khoản.
        boolean targetActive = request.active();
        account.setActive(targetActive);

        // Vô hiệu hóa phiên cũ khi khóa tài khoản.
        if (!targetActive) {
            account.setSessionVersion(account.getSessionVersion() + 1);
            refreshTokenRepository.deleteByAccountId(account.getId());
        }
        accountRepository.save(account);

        // Trả thông tin người dùng sau cập nhật.
        return toAdminUserResponse(user);
    }

    private AdminUserResponse toAdminUserResponse(User user) {
        return  new AdminUserResponse(
                user.getId(),
                user.getFullName(),
                user.getAccount().getEmail(),
                user.getAccount().getActive(),
                user.getAccount().getCreatedAt());
    }
}

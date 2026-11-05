package ute.phuc.quanngon.dto.Response;

import ute.phuc.quanngon.enums.Role;

public record UpdateUserInfoResponse(
        String fullName,
        String email,
        Role role
) {
}

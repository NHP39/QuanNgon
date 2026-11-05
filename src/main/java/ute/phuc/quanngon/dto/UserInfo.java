package ute.phuc.quanngon.dto;

import ute.phuc.quanngon.enums.Role;

public record UserInfo(
        Long userId,
        String email,
        String fullName,
        Role role
) {
}

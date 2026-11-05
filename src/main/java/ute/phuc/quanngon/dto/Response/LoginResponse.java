package ute.phuc.quanngon.dto.Response;

import ute.phuc.quanngon.dto.UserInfo;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        UserInfo userInfo
) {
}

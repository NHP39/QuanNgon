package ute.phuc.quanngon.dto.Request;

import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(
        @NotNull(message = "Trạng thái tài khoản không được để trống")
        Boolean active
) {
}

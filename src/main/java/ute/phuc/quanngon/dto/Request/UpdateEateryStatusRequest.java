package ute.phuc.quanngon.dto.Request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import ute.phuc.quanngon.enums.EateryStatus;

public record UpdateEateryStatusRequest(
        @NotNull(message = "Trạng thái không được để trống") EateryStatus status,

        String reason,

        @NotNull(message = "Phiên bản không được để trống")
        @PositiveOrZero(message = "Phiên bản phải lớn hơn hoặc bằng 0")
        Long version
) {
}

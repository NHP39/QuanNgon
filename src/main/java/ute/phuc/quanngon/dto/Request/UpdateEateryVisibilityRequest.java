package ute.phuc.quanngon.dto.Request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record UpdateEateryVisibilityRequest(
        @NotNull(message = "Trạng thái ẩn không được để trống")
        Boolean hidden,

        @NotNull(message = "Version không được để trống")
        @PositiveOrZero(message = "Version phải lớn hơn hoặc bằng 0")
        Long version
) {
}

package ute.phuc.quanngon.dto.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateUserInfoRequest(
        @NotBlank(message = "Họ và tên không được để trống")
        @Size(max = 255, message = "Họ và tên không được vượt quá 255 ký tự")
        String fullName
) {
}

package ute.phuc.quanngon.dto.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoryNameRequest(
        @NotBlank(message = "Tên danh mục không được để trống")
        @Size(min = 2, max = 80, message = "Tên danh mục phải từ 2 đến 80 ký tự")
        String name
) {
}

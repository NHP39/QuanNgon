package ute.phuc.quanngon.dto.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddressRequest(

        @NotBlank(message = "Đường không được để trống")
        @Size(max = 255, message = "Đường không được vượt quá 255 ký tự")
        String street,

        @NotBlank(message = "Phường/Xã không được để trống")
        @Size(max = 255, message = "Phường/Xã không được vượt quá 255 ký tự")
        String ward,

        @NotBlank(message = "Tỉnh/Thành phố không được để trống")
        @Size(max = 255, message = "Tỉnh/Thành phố không được vượt quá 255 ký tự")
        String province
) {
}

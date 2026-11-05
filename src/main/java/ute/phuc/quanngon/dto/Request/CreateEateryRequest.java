package ute.phuc.quanngon.dto.Request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateEateryRequest(

        @NotBlank(message = "Tên quán không được để trống")
        @Size(max = 255, message = "Tên quán không được vượt quá 255 ký tự")
        String name,

        @NotBlank(message = "Số điện thoại không được để trống")
        @Pattern(
                regexp = "^0[0-9]{9}$",
                message = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0"
        )
        String phoneContact,

        @NotNull(message = "Category không được để trống")
        Long categoryId,

        @Size( min = 10, max = 2000, message = "Nội dung phải từ 10 đến 2000 ký tự" )
        @NotBlank(message = "Nội dung không được để trống")
        String content,

        @Valid
        @NotNull(message = "Địa chỉ không được để trống")
        AddressRequest address
) {
    public CreateEateryRequest {
        // Chuẩn hóa số điện thoại trước khi validation.
        phoneContact = phoneContact == null ? null : phoneContact.strip();

        if (phoneContact != null && phoneContact.startsWith("+84")) {
            phoneContact = "0" + phoneContact.substring(3);
        }
    }
}

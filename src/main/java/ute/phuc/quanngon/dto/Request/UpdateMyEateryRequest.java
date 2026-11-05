package ute.phuc.quanngon.dto.Request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdateMyEateryRequest(
        @NotBlank(message = "Tên quán không được để trống")
        @Size(max = 255, message = "Tên quán không được vượt quá 255 ký tự")
        String name,

        @NotBlank(message = "Số điện thoại không được để trống")
        @Pattern(
                regexp = "^0[0-9]{9}$",
                message = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0"
        )
        String phoneContact,

        @NotNull(message = "Danh mục không được để trống")
        @Positive(message = "ID danh mục phải lớn hơn 0")
        Long categoryId,

        @NotBlank(message = "Nội dung không được để trống")
        @Size(min = 10, max = 2000, message = "Nội dung phải từ 10 đến 2000 ký tự")
        String content,

        @Valid
        @NotNull(message = "Địa chỉ không được để trống")
        AddressRequest address,

        @NotNull(message = "Version không được để trống")
        @PositiveOrZero(message = "Version phải lớn hơn hoặc bằng 0")
        Long version,

        List<
                @NotNull(message = "ID ảnh không được để trống")
                @Positive(message = "ID ảnh phải lớn hơn 0")
                Long> removeImageIds
) {
    public UpdateMyEateryRequest {
        name = name == null ? null : name.strip();
        content = content == null ? null : content.strip();
        phoneContact = phoneContact == null ? null : phoneContact.strip();

        if (phoneContact != null && phoneContact.startsWith("+84")) {
            phoneContact = "0" + phoneContact.substring(3);
        }

        removeImageIds = removeImageIds == null ? List.of() : removeImageIds;
    }
}

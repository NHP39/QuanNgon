package ute.phuc.quanngon.dto.Request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateReviewRequest(
        @NotNull(message = "Điểm chất lượng món ăn không được để trống")
        @Min(value = 1, message = "Điểm phải từ 1 đến 5")
        @Max(value = 5, message = "Điểm phải từ 1 đến 5")
        Integer foodQuantity,

        @NotNull(message = "Điểm phục vụ không được để trống")
        @Min(value = 1, message = "Điểm phải từ 1 đến 5")
        @Max(value = 5, message = "Điểm phải từ 1 đến 5")
        Integer serviceQuantity,

        @NotNull(message = "Điểm không gian không được để trống")
        @Min(value = 1, message = "Điểm phải từ 1 đến 5")
        @Max(value = 5, message = "Điểm phải từ 1 đến 5")
        Integer space,

        @NotNull(message = "Điểm vệ sinh không được để trống")
        @Min(value = 1, message = "Điểm phải từ 1 đến 5")
        @Max(value = 5, message = "Điểm phải từ 1 đến 5")
        Integer cleanliness,

        @NotBlank(message = "Nhận xét không được để trống")
        @Size(min = 10, max = 1000, message = "Nhận xét phải từ 10 đến 1000 ký tự")
        String content
) {
    public CreateReviewRequest {
        content = content == null ? null : content.strip();
    }
}

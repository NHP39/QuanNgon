import { CircleCheck, CircleX, Clock3, EyeOff } from "lucide-react";

export const ADMIN_EATERY_TABS = [
    { status: "PENDING", label: "Chờ duyệt", icon: Clock3 },
    { status: "APPROVED", label: "Đã duyệt", icon: CircleCheck },
    { status: "REJECTED", label: "Từ chối", icon: CircleX },
    { status: "HIDDEN", label: "Đã ẩn", icon: EyeOff }
];

export const ACTION_TARGETS = { approve: "APPROVED", reject: "REJECTED" };

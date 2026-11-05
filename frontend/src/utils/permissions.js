export function canUseMemberFeatures(user) {
    return user?.role === "USER" || user?.role === "ADMIN";
}

export function isAdmin(user) {
    return user?.role === "ADMIN";
}

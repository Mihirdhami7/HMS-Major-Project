/**
 * Canonical role names + helpers.
 * Backend currently returns: "Patient", "Doctor", "Admin", "Supplier", and "superAdmin"
 * for the super admin. Always compare roles through these helpers (case-insensitive).
 */
export const ROLES = {
    PATIENT: "Patient",
    DOCTOR: "Doctor",
    ADMIN: "Admin",
    SUPPLIER: "Supplier",
    SUPERADMIN: "SuperAdmin",
};

/** Normalise any spelling ("superAdmin", "superadmin", "SuperAdmin") to the canonical one. */
export const normalizeRole = (role) => {
    if (!role) return null;
    const key = String(role).trim().toLowerCase();
    return Object.values(ROLES).find((r) => r.toLowerCase() === key) || role;
};

export const isRole = (role, expected) =>
    !!role && !!expected && String(role).toLowerCase() === String(expected).toLowerCase();

/** Home route for each role (used after login and by the header). */
export const ROLE_HOME = {
    [ROLES.PATIENT]: "/patient",
    [ROLES.DOCTOR]: "/doctor",
    [ROLES.ADMIN]: "/admin",
    [ROLES.SUPPLIER]: "/supplier",
    [ROLES.SUPERADMIN]: "/superadmin",
};

export const homeForRole = (role) => ROLE_HOME[normalizeRole(role)] || "/";

/** Roles a user can pick on the login form. */
export const LOGIN_ROLES = [ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN, ROLES.SUPPLIER];

/** Roles that must pick a hospital when logging in. */
export const roleNeedsHospital = (role) =>
    [ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN].includes(normalizeRole(role));

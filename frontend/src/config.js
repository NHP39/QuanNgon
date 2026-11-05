const configuredApiBase = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL = (configuredApiBase || (import.meta.env.DEV ? "http://localhost:8080/api" : "/api")).replace(/\/+$/, "");


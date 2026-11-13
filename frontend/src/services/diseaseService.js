import apiClient, { authHeaders, handleRequest } from "./apiClient";
import { DISEASES } from "./endpoints";

/** Public: disease catalogue → data: { departments: [..], diseases: [{ id, name, department, description, image, symptoms }] } */
export const listDiseases = (token = null, department = null) =>
    handleRequest(() =>
        apiClient.get(DISEASES.LIST_CREATE, {
            headers: authHeaders(token),
            params: department ? { department } : {},
        })
    );

/** SuperAdmin only */
export const createDisease = (token, data) =>
    handleRequest(() => apiClient.post(DISEASES.LIST_CREATE, data, { headers: authHeaders(token) }));

/** SuperAdmin only */
export const updateDisease = (token, diseaseId, data) =>
    handleRequest(() => apiClient.patch(DISEASES.DETAIL(diseaseId), data, { headers: authHeaders(token) }));

/** SuperAdmin only */
export const deleteDisease = (token, diseaseId) =>
    handleRequest(() => apiClient.delete(DISEASES.DETAIL(diseaseId), { headers: authHeaders(token) }));

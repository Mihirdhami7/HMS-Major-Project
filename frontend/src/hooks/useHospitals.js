import { useEffect, useState } from "react";
import { listHospitals, listDepartments } from "../services/hospitalService";
import { pickList } from "../services/apiClient";

/**
 * Loads hospitals from GET /api/hospitals/  → { hospitals: [{ id, name, ... }] }
 *
 * NOTE: the backend currently requires a logged-in user for this endpoint.
 * On public pages (login / signup) the request fails with 401/403, so `available`
 * becomes false and the page should let the user type the hospital name instead.
 * Once the backend exposes a public hospital list, this hook works unchanged.
 *
 * @param {string|null} token
 */
export const useHospitals = (token = null) => {
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [available, setAvailable] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            const result = await listHospitals(token);
            if (cancelled) return;
            if (result.success) {
                setHospitals(pickList(result, "hospitals"));
                setAvailable(true);
                setError(null);
            } else {
                setHospitals([]);
                setAvailable(false);
                setError(result.message);
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    return { hospitals, loading, available, error };
};

/**
 * Loads departments of one hospital: GET /api/hospitals/<hospitalId>/departments/
 * → { departments: [{ id, name, description, headOfDepartment }] }
 * Accepts a hospital NAME too: resolves it to an id from the hospitals list first.
 *
 * @param {string|null} token
 * @param {{ hospitalId?: string, hospitalName?: string }} target
 */
export const useDepartments = (token, { hospitalId, hospitalName } = {}) => {
    const [departments, setDepartments] = useState([]);
    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        if (!token || (!hospitalId && !hospitalName)) {
            setDepartments([]);
            return undefined;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            let id = hospitalId;
            let found = null;
            if (!id) {
                const hRes = await listHospitals(token);
                if (cancelled) return;
                found = pickList(hRes, "hospitals").find(
                    (h) => h.name?.toLowerCase() === hospitalName.toLowerCase()
                );
                id = found?.id;
                if (!id) {
                    setError(hRes.success ? `Hospital "${hospitalName}" not found` : hRes.message);
                    setDepartments([]);
                    setLoading(false);
                    return;
                }
            }
            const dRes = await listDepartments(token, id);
            if (cancelled) return;
            if (dRes.success) {
                setDepartments(pickList(dRes, "departments"));
                setHospital(found || { id, name: dRes.data?.hospitalName || hospitalName });
            } else {
                setError(dRes.message);
                setDepartments([]);
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [token, hospitalId, hospitalName, reloadKey]);

    return { departments, hospital, loading, error, reload: () => setReloadKey((k) => k + 1) };
};

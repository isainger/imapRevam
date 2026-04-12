const BASE_URL = import.meta.env.VITE_BASE_URL  || "http://localhost:3001/api/v1";

// AUTH ENDPOINTS
export const endpoints = {
  INSERTDATA_API: BASE_URL + "/incidents",
  FETCHINCIDENTS_API: (incident_number) => `${BASE_URL}/incidents/${incident_number}`,
  FETCHALLINCIDENTS_API: BASE_URL + "/incidents",
  AI_IMPROVE_API: BASE_URL + "/ai/improve",
  AI_DASHBOARD_INSIGHTS_API: BASE_URL + "/ai/dashboard-insights",
  DEPARTMENT_CHANGE_EMAIL_API: BASE_URL + "/incidents/department-change-email",
  FETCH_RECIPIENTS_API: (incident_id) => `${BASE_URL}/incidents/${incident_id}/recipients`,
  SALESFORCE_CREATE_CASE_API: BASE_URL + "/salesforce/create-case",
};

/**
 * @param {Record<string, unknown>} snapshot
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function fetchDashboardInsights(snapshot, opts = {}) {
  const res = await fetch(endpoints.AI_DASHBOARD_INSIGHTS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snapshot }),
    signal: opts.signal,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 503 && data.code === "AI_NOT_CONFIGURED") {
    return {
      ok: false,
      configured: false,
      insights: null,
      error: data.error || "AI not configured",
    };
  }
  if (!res.ok) {
    return {
      ok: false,
      configured: true,
      insights: null,
      error: data.error || `Request failed (${res.status})`,
    };
  }
  return {
    ok: true,
    configured: true,
    insights: typeof data.insights === "string" ? data.insights : "",
    error: null,
  };
}
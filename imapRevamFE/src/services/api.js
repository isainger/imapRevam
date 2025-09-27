const BASE_URL = import.meta.env.VITE_BASE_URL  || "http://localhost:4000/api/v1";

// AUTH ENDPOINTS
export const endpoints = {
  INSERTDATA_API: BASE_URL + "/incidents",
  FETCHINCIDENTS_API: (incident_number) => `${BASE_URL}/incidents/${incident_number}`,

};
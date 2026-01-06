import { endpoints } from "./api";
import { apiConnector } from "./apiConnector";

// -----------FETCH Data-----------

export const fetchIncidentByNumber = async (incident_number) => {
  try {
    const response = await apiConnector(
      "GET",
      endpoints.FETCHINCIDENTS_API(incident_number),
      null,
      {
        timeout: 6000,
        // validateStatus: (status) => status < 500, // allow 404
      }
    );
    return response.data;
  } catch (err) {
    if (err.code === "ECONNABORTED") {
      throw new Error("REQUEST_TIMEOUT");
    }
    if (err.response?.status === 404) {
      return null;
    }
    // backend error
    if (err.response?.status === 500) {
      throw new Error("SERVER_ERROR");
    }
    throw err; // real server/network failure
  }
};

//-------------Fetch All Incidents---------
export const fetchAllIncidents = async () => {
  try {
    const response = await apiConnector("GET", endpoints.FETCHALLINCIDENTS_API);
    return response.data;
  } catch (error) {
    console.log("Error Fetching Incident:", error);
    throw error;
  }
};

//-----------Save Data--------------

export const saveIncident = async (payload) => {
  try {
    const response = await apiConnector(
      "POST",
      endpoints.INSERTDATA_API,
      payload
    );
    if (response?.data?.success === false) {
      return {
        noChanges: true,
        message: response.data.message,
      };
    }
    return {
      noChanges: false,
      data: response.data,
    };
  } catch (error) {
    console.error("❌ Error Saving Incident:", error);
    throw error;
  }
};

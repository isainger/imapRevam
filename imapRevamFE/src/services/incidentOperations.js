import { endpoints } from "./api"
import { apiConnector } from "./apiConnector"

// -----------FETCH Data-----------

export const fetchIncidentByNumber=async(incident_number)=>{
    try {
        const response=await apiConnector(
            "GET",
            endpoints.FETCHINCIDENTS_API(incident_number)
        );
        return response.data
    } catch (error) {
        console.log("Error Fetching Incident:", error);
        throw error
    }
}

//-----------Save Data--------------

export const saveIncident= async(payload)=>{
    try {
        const response = await apiConnector(
            "POST",
            endpoints.INSERTDATA_API,
            payload
        );
        return response.data
    } catch (error) {
    console.error("❌ Error Saving Incident:", error);
    throw error
    }
}
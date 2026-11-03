import api from "./api";

const investigationService = {
  async investigate(incidentId) {
    const response = await api.post(
      `/api/incidents/${encodeURIComponent(incidentId)}/investigate`,
      null,
      {
        timeout: 0,
      }
    );

    return response.data;
  },
};

export default investigationService;
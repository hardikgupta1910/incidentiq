import api from "./api";

const evaluationService = {
  async run({ incidentId, providers }) {
    const response = await api.post(
      "/api/evaluations",
      null,
      {
        params: {
          incident_id: incidentId,
          providers: providers.join(","),
        },
        timeout: 0,
      }
    );

    return response.data;
  },
};

export default evaluationService;
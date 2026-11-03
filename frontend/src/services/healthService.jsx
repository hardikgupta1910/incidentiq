import api from "./api";

const healthService = {
  async getProviders({ signal } = {}) {
    const response = await api.get("/api/health/providers", {
      signal,
    });

    return response.data;
  },
};

export default healthService;
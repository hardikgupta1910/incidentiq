import api from "./api";

const privacyService = {
  async get({ signal } = {}) {
    const response = await api.get("/api/settings/privacy", {
      signal,
    });

    return response.data;
  },

  async update({ enabled, confirmed = false }) {
    const response = await api.put("/api/settings/privacy", {
      enabled,
      confirm_external_processing: confirmed,
    });

    return response.data;
  },
};

export default privacyService;
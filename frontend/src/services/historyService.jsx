import api from "./api";

const historyService = {
  async list({ search = "", offset = 0, signal } = {}) {
    const response = await api.get("/api/investigations", {
      params: { search, offset, limit: 10 }, signal,
    });
    return response.data;
  },
  async get(id, { signal } = {}) {
    const response = await api.get(`/api/investigations/${encodeURIComponent(id)}`, { signal });
    return response.data;
  },
};

export default historyService;

import api from "./api";

const incidentService = {

    async list({
  search = "",
  status = "",
  limit = 10,
  offset = 0,
  signal,
} = {}) {
  const response = await api.get("/api/incidents", {
    params: {
      search,
      status: status || undefined,
      limit,
      offset,
    },
    signal,
  });

  return response.data;
},


  async create(file, { signal } = {}) {
    const form = new FormData();
    form.append("file", file);

    const response = await api.post("/api/incidents", form, {
      signal,
    });

    return response.data;
  },

  async getById(incidentId, { signal } = {}) {
    const response = await api.get(
      `/api/incidents/${encodeURIComponent(incidentId)}`,
      { signal }
    );

    return response.data;
  },
};

export default incidentService;
import api from "./api";

const knowledgeBaseService = {
  async list({ search = "", status = "", offset = 0, signal } = {}) {
    const response = await api.get("/api/knowledge/documents", {
      params: { search, status: status || undefined, offset, limit: 10 }, signal,
    });
    return response.data;
  },
  async upload(file) {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post("/api/knowledge/documents", form, { timeout: 0 });
    return response.data;
  },
  async retry(id) {
    const response = await api.post(`/api/knowledge/documents/${encodeURIComponent(id)}/retry`, null, { timeout: 0 });
    return response.data;
  },
  async remove(id) {
    await api.delete(`/api/knowledge/documents/${encodeURIComponent(id)}`, { timeout: 0 });
  },
};
export default knowledgeBaseService;

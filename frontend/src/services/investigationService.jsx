import api from "./api";

// Normalize API JSON for components that use camelCase properties.
export function normalizeApiData(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeApiData);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
        normalizeApiData(item),
      ])
    );
  }

  return value;
}

const investigationService = {
  async investigate(incidentId) {
    const response = await api.post(
      `/api/incidents/${encodeURIComponent(incidentId)}/investigate`,
      null,
      { timeout: 0 }
    );

    return normalizeApiData(response.data);
  },
};

export default investigationService;
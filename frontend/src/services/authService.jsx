import api from "./api";

const authService = {
  async register({ username, password }) {
    const response = await api.post(
      "/api/auth/register",
      {
        username,
        password,
      },
      {
        skipAuth: true,
      }
    );

    return response.data;
  },

  async login({ username, password }) {
    const form = new URLSearchParams();

    form.set("grant_type", "password");
    form.set("username", username);
    form.set("password", password);

    const response = await api.post("/api/auth/token", form, {
      skipAuth: true,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response.data;
  },

  async getCurrentUser({ signal } = {}) {
    const response = await api.get("/api/auth/me", {
      signal,
    });

    return response.data;
  },

  async getUsers({ signal } = {}) {
    const response = await api.get("/api/auth/users", {
      signal,
    });

    return response.data;
  },
};

export default authService;
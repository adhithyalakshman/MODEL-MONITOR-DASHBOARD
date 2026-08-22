import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const client = axios.create({ baseURL: BASE_URL });

export const api = {
  listModels: () => client.get("/v1/models").then((r) => r.data),

  registerModel: (payload) =>
    client.post("/v1/models", payload).then((r) => r.data),

  getStats: (modelId, limit = 50) =>
    client.get(`/v1/models/${modelId}/stats`, { params: { limit } }).then((r) => r.data),

  getPredictions: (modelId, limit = 50) =>
    client.get(`/v1/models/${modelId}/predictions`, { params: { limit } }).then((r) => r.data),

  getAlerts: (modelId, limit = 50) =>
    client.get(`/v1/models/${modelId}/alerts`, { params: { limit } }).then((r) => r.data),

  getAlertRules: (modelId) =>
    client.get(`/v1/models/${modelId}/alert-rules`).then((r) => r.data),

  createAlertRule: (modelId, payload) =>
    client.post(`/v1/models/${modelId}/alert-rules`, payload).then((r) => r.data),

  getBaseline: (modelId) =>
    client.get(`/v1/models/${modelId}/baseline`).then((r) => r.data),

  captureBaseline: (modelId, fromRecent = 500) =>
    client.post(`/v1/models/${modelId}/baseline`, { from_recent: fromRecent }).then((r) => r.data),

  compareModels: (modelIds, limit = 50) =>
    client
      .get("/v1/compare", { params: { model_ids: modelIds.join(","), limit } })
      .then((r) => r.data),
};

export default api;

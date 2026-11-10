import axios from "axios";

const api = axios.create({
  headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
  withCredentials: true,
});

export default api;

// Every call the browser makes to our own backend (the /api folder).
async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new Error("Can't reach the server. Check your internet connection and try again.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* the server sent no JSON */
  }

  if (!res.ok) {
    throw new Error(data?.error || `The server had a problem (error ${res.status}). Please try again.`);
  }
  return data;
}

export const createGame = (payload) =>
  request("/api/games", { method: "POST", body: JSON.stringify(payload) });

// Note: no dice value is sent. The server rolls the die itself.
export const rollDice = (id) => request(`/api/games/${id}/roll`, { method: "POST" });
export const holdPoints = (id) => request(`/api/games/${id}/hold`, { method: "POST" });

export const getLeaderboard = (limit = 10) => request(`/api/leaderboard?limit=${limit}`);

export const getHistory = ({ name, limit = 10 } = {}) => {
  const params = new URLSearchParams({ limit });
  if (name) params.set("name", name);
  return request(`/api/history?${params}`);
};

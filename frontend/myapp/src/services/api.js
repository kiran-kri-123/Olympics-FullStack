const viteBaseUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : '';

function resolveDevelopmentBaseUrl() {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return 'http://localhost:5000';
}

const resolvedBaseUrl = (
  viteBaseUrl
  || (import.meta.env?.MODE === 'development' ? resolveDevelopmentBaseUrl() : '')
).replace(/\/$/, '');

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request(path, options = {}, fallbackMessage = 'Request failed') {
  const response = await fetch(`${resolvedBaseUrl}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload;
}

export const apiClient = {
  baseUrl: resolvedBaseUrl,

  getSummary() {
    return request('/summary', {}, 'Failed to fetch summary');
  },

  getAthletes(filters = {}) {
    const params = new URLSearchParams();
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.page) params.append('page', String(filters.page));
    if (filters.search) params.append('search', String(filters.search));
    if (filters.sport) params.append('sport', String(filters.sport));
    if (filters.medal) params.append('medal', String(filters.medal));
    if (filters.year) params.append('year', String(filters.year));
    if (filters.country) params.append('country', String(filters.country));
    return request(`/athletes?${params.toString()}`, {}, 'Failed to fetch athletes');
  },

  getRegions() {
    return request('/regions', {}, 'Failed to fetch regions');
  },

  getMedalTrends() {
    return request('/analytics/medal-trends', {}, 'Failed to fetch medal trends');
  },

  getMedalLeaders() {
    return request('/analytics/medal-leaders', {}, 'Failed to fetch medal leaders');
  },

  getGenderDistribution() {
    return request('/analytics/gender-distribution', {}, 'Failed to fetch gender distribution');
  },

  getEventsBySeason() {
    return request('/analytics/events-by-season', {}, 'Failed to fetch events by season');
  },

  getAthleteParticipation() {
    return request('/analytics/athlete-participation', {}, 'Failed to fetch athlete participation');
  },
};

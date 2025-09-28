import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 90000, // 90 giây để chống Render sleep
})

export function getHealthLogs(params) {
  return api.get('/health-logs', { params }).then(r => r.data)
}

export function getMonthlyStats(params) {
  return api.get('/health-logs/stats/monthly', { params }).then(r => r.data)
}

export function createHealthLog(payload) {
  return api.post('/health-logs', payload).then(r => r.data)
}

export function updateHealthLog(id, payload) {
  return api.put(`/health-logs/${id}`, payload).then(r => r.data)
}

export function deleteHealthLog(id) {
  return api.delete(`/health-logs/${id}`).then(r => r.data)
}

export function getMiFitSleep(params) {
  return api.get('/mifit/sleep', { params }).then(r => r.data)
}



import apiClient from './api'

const reservationService = {
  async getAll(params = {}) {
    const response = await apiClient.get('/reservations/', { params })
    return response.data
  },

  async getMine(params = {}) {
    const response = await apiClient.get('/reservations/mine/', { params })
    return response.data
  },

  async getById(id) {
    const response = await apiClient.get(`/reservations/${id}/`)
    return response.data
  },

  async create(data) {
    const response = await apiClient.post('/reservations/', data)
    return response.data
  },

  async update(id, data) {
    const response = await apiClient.patch(`/reservations/${id}/`, data)
    return response.data
  },

  async cancel(id) {
    const response = await apiClient.post(`/reservations/${id}/cancel/`)
    return response.data
  },

  async approve(id, note = '') {
    const response = await apiClient.post(`/reservations/${id}/approve/`, { note })
    return response.data
  },

  async reject(id, note = '') {
    const response = await apiClient.post(`/reservations/${id}/reject/`, { note })
    return response.data
  },

  async downloadReport(params = {}) {
    const response = await apiClient.get('/reservations/report/', {
      params,
      responseType: 'blob',
    })
    return response.data
  },
}

export default reservationService

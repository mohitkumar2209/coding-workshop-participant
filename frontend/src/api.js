import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3001/api/api-service'
})
export default api
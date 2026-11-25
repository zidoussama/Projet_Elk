import api from './axios'
import type {
  DashboardLogRecord,
  DashboardLogSearchResponse,
  DashboardStatsResponse,
} from '../types/dashboard'

export async function getDashboardStats(): Promise<DashboardStatsResponse> {
  const { data } = await api.get<DashboardStatsResponse>('/dashboard/stats')
  return data
}

function formatLogTimestamp(timestamp?: string): string {
  if (!timestamp) return '—'

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return timestamp

  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0')

  return `${hours}:${minutes}:${seconds}.${milliseconds}`
}

export async function getLatestDashboardLogs(): Promise<DashboardLogRecord[]> {
  const { data } = await api.get<DashboardLogSearchResponse>('/logs/search', {
    params: { page: 1, sort: 'desc' },
  })

  return data.results.slice(0, 6).map((log) => ({
    timestamp: formatLogTimestamp(log['@timestamp'] ?? log.timestamp),
    level: log.level || 'UNKNOWN',
    service: log.service || '—',
    message: log.message || '—',
  }))
}

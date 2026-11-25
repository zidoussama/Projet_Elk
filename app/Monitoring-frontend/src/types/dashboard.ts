export type DashboardNavItem = 'Dashboard' | 'Upload' | 'Files' | 'Search' | 'History' | 'Kibana'

export interface DashboardAppBarProps {
  activeItem?: DashboardNavItem
  userName?: string
  userRole?: string
}

export interface DashboardMetric {
  label: string
  value: string
  detail: string
  icon: 'grid' | 'activity' | 'warning' | 'folder'
  tone: 'blue' | 'teal' | 'red' | 'gold'
}

export interface DashboardStatsResponse {
  totalLogs: number
  logsToday: number
  errorLogs: number
  criticalLogs: number
  errorCriticalLogs: number
  importedFiles: number
  hourlyEvolution: Array<{ hour: string | null; count: number }>
  levelDistribution: Array<{ level: string; count: number }>
}

export interface DashboardLevelSummary {
  level: string
  percent: number
  count: number
  color: string
}

export interface DashboardLogRecord {
  timestamp: string
  level: string
  service: string
  message: string
}

export interface DashboardSearchLog {
  level?: string
  service?: string
  message?: string
  timestamp?: string
  '@timestamp'?: string
}

export interface DashboardLogSearchResponse {
  page: number
  size: number
  total: number
  results: DashboardSearchLog[]
}

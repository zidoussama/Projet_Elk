import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Folder,
  MoreHorizontal,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import AppBar from './components/appbar'
import Footer from './components/footer'
import type {
  DashboardLevelSummary,
  DashboardMetric,
} from '../../types/dashboard'
import { useDashboardData } from './hooks/useDashboardData'
import './dashboard.css'

const levelColors: Record<string, string> = {
  INFO: '#5487c3',
  DEBUG: '#aab6c6',
  WARNING: '#e5b341',
  ERROR: '#e35b61',
  CRITICAL: '#a52e38',
}

const knownLevels = new Set(Object.keys(levelColors).map((level) => level.toLowerCase()))

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value)
}

function formatCompactCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(value)
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred.'
}

function getLevelClass(level: string): string {
  const normalized = level.toLowerCase()
  return knownLevels.has(normalized) ? `level-${normalized}` : 'level-other'
}

function getHourlyLabel(hour: string | null): string {
  if (!hour) return '—'
  const date = new Date(hour)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date)
}

function MetricIcon({ icon }: { icon: DashboardMetric['icon'] }) {
  if (icon === 'activity') return <Activity size={15} />
  if (icon === 'warning') return <AlertTriangle size={15} />
  if (icon === 'folder') return <Folder size={15} />
  return <span className="metric-grid-icon" aria-hidden="true">▦</span>
}

function Dashboard() {
  const {
    stats,
    latestLogs,
    statsLoading,
    statsFetching,
    statsError,
    logsLoading,
    logsError,
    refresh,
  } = useDashboardData()
  const metricValue = (value: number | undefined) => {
    if (value !== undefined) return formatNumber(value)
    if (statsLoading) return 'Loading'
    if (statsError) return 'Unavailable'
    return '—'
  }
  const metrics: DashboardMetric[] = [
    { label: 'Total logs indexed', value: metricValue(stats?.totalLogs), detail: 'Across all log indices', icon: 'grid', tone: 'blue' },
    { label: 'Logs today', value: metricValue(stats?.logsToday), detail: 'Since 00:00 UTC', icon: 'activity', tone: 'teal' },
    { label: 'Error logs', value: metricValue(stats?.errorLogs), detail: 'ERROR-level events', icon: 'warning', tone: 'red' },
    { label: 'Uploaded files', value: metricValue(stats?.importedFiles), detail: 'All uploaded files', icon: 'folder', tone: 'gold' },
  ]
  const hourlyLogs = (stats?.hourlyEvolution ?? []).map(({ hour, count }) => ({
    time: getHourlyLabel(hour),
    count,
  }))
  const distribution = stats?.levelDistribution ?? []
  const totalLevelCount = distribution.reduce((total, entry) => total + entry.count, 0)
  const levelSummary: DashboardLevelSummary[] = distribution.map(({ level, count }) => ({
    level,
    count,
    percent: totalLevelCount === 0 ? 0 : (count / totalLevelCount) * 100,
    color: levelColors[level.toUpperCase()] ?? '#8490a0',
  }))

  return (
    <div className="dashboard-shell" id="dashboard">
      <AppBar />

      <main className="dashboard-main">
        <div className="dashboard-breadcrumbs">
          <span>LogSight</span>
          <ChevronRight size={12} />
          <strong>Dashboard</strong>
        </div>

        <section className="dashboard-heading">
          <div>
            <h1>Dashboard</h1>
            <p>Monitor log activity and system health across your e-commerce platform.</p>
          </div>
          <div className="dashboard-heading-actions">
            <span className="live-status">
              <i />{statsFetching ? 'Updating' : statsError ? 'Unavailable' : 'Live data'}
            </span>
            <button
              type="button"
              className="refresh-button"
              onClick={() => { void refresh() }}
              disabled={statsFetching}
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </section>

        {statsError && (
          <div className="dashboard-error-banner" role="alert">
            Dashboard statistics could not be loaded: {getErrorMessage(statsError)}
          </div>
        )}

        <section className="metric-grid" aria-label="Log summary">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <div className="metric-card-copy">
                <span className="metric-label">{metric.label}</span>
                <strong className="metric-value">{metric.value}</strong>
                <span className="metric-trend">{metric.detail}</span>
              </div>
              <span className={`metric-icon metric-icon-${metric.tone}`}>
                <MetricIcon icon={metric.icon} />
              </span>
            </article>
          ))}
        </section>

        <section className="dashboard-middle-grid">
          <article className="dashboard-card volume-card">
            <div className="card-heading">
              <div>
                <h2>Logs per hour</h2>
                <p>Log volume over the last 24 hours</p>
              </div>
              <button type="button" className="chart-range">
                Last 24 hours <ChevronDown size={12} />
              </button>
            </div>
            <div className="volume-chart">
              {statsLoading && !stats ? (
                <div className="dashboard-data-message">Loading hourly activity…</div>
              ) : hourlyLogs.length === 0 ? (
                <div className="dashboard-data-message">No hourly log data available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyLogs} margin={{ top: 10, right: 8, bottom: 0, left: -17 }}>
                    <defs>
                      <linearGradient id="logVolumeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0bb8bd" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#0bb8bd" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e9eef3" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      interval={3}
                      tick={{ fill: '#8a96a5', fontSize: 10 }}
                    />
                    <YAxis
                      domain={[0, 'auto']}
                      tickFormatter={formatCompactCount}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#8a96a5', fontSize: 10 }}
                    />
                    <Tooltip
                      formatter={(value) => [`${formatNumber(Number(value))} logs`, 'Volume']}
                      contentStyle={{ border: '1px solid #e6ebf0', borderRadius: 6, fontSize: 12 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#0bb4b9"
                      strokeWidth={2}
                      fill="url(#logVolumeFill)"
                      activeDot={{ r: 4, fill: '#fff', stroke: '#0bb4b9', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <article className="dashboard-card level-card">
            <div className="card-heading">
              <div>
                <h2>Logs by level</h2>
                <p>Distribution today</p>
              </div>
              <button type="button" className="icon-button" aria-label="More log level options">
                <MoreHorizontal size={17} />
              </button>
            </div>
            <div className="level-content">
              <div className="level-donut">
                {levelSummary.length > 0 && (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={levelSummary}
                          dataKey="count"
                          nameKey="level"
                          innerRadius="68%"
                          outerRadius="92%"
                          paddingAngle={2}
                          stroke="none"
                        >
                          {levelSummary.map((entry) => <Cell key={entry.level} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="level-total">
                      <strong>{formatCompactCount(totalLevelCount)}</strong>
                      <span>Total logs</span>
                    </div>
                  </>
                )}
                {statsLoading && !stats && <span className="level-empty-message">Loading…</span>}
                {!statsLoading && levelSummary.length === 0 && (
                  <span className="level-empty-message">No data</span>
                )}
              </div>
              <ul className="level-legend">
                {levelSummary.map((entry) => (
                  <li key={entry.level}>
                    <span className="level-name"><i style={{ backgroundColor: entry.color }} />{entry.level}</span>
                    <strong>{entry.percent.toFixed(1)}%</strong>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </section>

        <section className="dashboard-bottom-grid">
          <article className="dashboard-card latest-card">
            <div className="card-heading">
              <div>
                <h2>Latest logs</h2>
                <p>Most recent events across all services</p>
              </div>
              <a className="view-all-link" href="#logs">View all logs <ChevronRight size={14} /></a>
            </div>
            <div className="logs-table-wrap">
              <table className="logs-table">
                <thead>
                  <tr><th>Date / Time</th><th>Level</th><th>Service</th><th>Message</th></tr>
                </thead>
                <tbody>
                  {logsLoading && (
                    <tr><td className="dashboard-table-message" colSpan={4}>Loading recent logs…</td></tr>
                  )}
                  {logsError && (
                    <tr>
                      <td className="dashboard-table-message dashboard-table-error" colSpan={4}>
                        Could not load recent logs: {getErrorMessage(logsError)}
                      </td>
                    </tr>
                  )}
                  {!logsLoading && !logsError && latestLogs?.length === 0 && (
                    <tr><td className="dashboard-table-message" colSpan={4}>No logs found.</td></tr>
                  )}
                  {latestLogs?.map((log) => (
                    <tr key={`${log.timestamp}-${log.service}`}>
                      <td className="log-timestamp">{log.timestamp}</td>
                      <td><span className={`log-level ${getLevelClass(log.level)}`}>{log.level}</span></td>
                      <td>{log.service}</td>
                      <td className="log-message">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="dashboard-card quick-actions-card">
            <div className="card-heading">
              <div>
                <h2>Quick actions</h2>
                <p>Common tasks and tools</p>
              </div>
            </div>
            <div className="quick-actions">
              <a className="quick-action" href="#upload">
                <span className="quick-action-icon action-teal"><Upload size={16} /></span>
                <span className="quick-action-copy"><strong>Upload logs</strong><small>Import CSV, JSON or TXT files</small></span>
                <ChevronRight size={15} />
              </a>
              <a className="quick-action" href="#search">
                <span className="quick-action-icon action-blue"><Search size={16} /></span>
                <span className="quick-action-copy"><strong>Search logs</strong><small>Query across all indexed logs</small></span>
                <ChevronRight size={15} />
              </a>
              <a className="quick-action" href="#kibana">
                <span className="quick-action-icon action-gold"><FileText size={16} /></span>
                <span className="quick-action-copy"><strong>Open Kibana</strong><small>Explore advanced visualizations</small></span>
                <ExternalLink size={13} />
              </a>
            </div>
          </article>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Dashboard
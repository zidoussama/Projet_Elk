import { useQuery } from '@tanstack/react-query'
import { getDashboardStats, getLatestDashboardLogs } from '../../../api/api'
import type { DashboardEvolutionInterval } from '../../../types/dashboard'

const REFRESH_INTERVAL = 30_000

export function useDashboardData(interval: DashboardEvolutionInterval) {
  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats', interval],
    queryFn: () => getDashboardStats(interval),
    refetchInterval: REFRESH_INTERVAL,
  })

  const latestLogsQuery = useQuery({
    queryKey: ['dashboard', 'latest-logs'],
    queryFn: getLatestDashboardLogs,
    refetchInterval: REFRESH_INTERVAL,
  })

  async function refresh() {
    await Promise.all([statsQuery.refetch(), latestLogsQuery.refetch()])
  }

  return {
    stats: statsQuery.data,
    latestLogs: latestLogsQuery.data,
    statsLoading: statsQuery.isLoading,
    statsFetching: statsQuery.isFetching,
    statsError: statsQuery.error,
    logsLoading: latestLogsQuery.isLoading,
    logsError: latestLogsQuery.error,
    refresh,
  }
}

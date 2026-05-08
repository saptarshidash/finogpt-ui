import { useQueries } from "@tanstack/react-query"
import {
  DEFAULT_DASHBOARD_PERIOD,
  dashboardQueryKeys,
  getDashboardAnomaliesSummary,
  getDashboardCashflowDaily,
  getDashboardOverview,
  getDashboardRecurringSummary,
  getDashboardSpendTrend,
  getDashboardTopCategories,
  getDashboardTopMerchants,
} from "@/features/dashboard/dashboard-api"
import type { DashboardPeriod } from "@/features/dashboard/dashboard-types"

export function useDashboardHomeData(period: DashboardPeriod = DEFAULT_DASHBOARD_PERIOD) {
  const [
    overviewQuery,
    spendTrendQuery,
    cashflowDailyQuery,
    topMerchantsQuery,
    topCategoriesQuery,
    anomaliesSummaryQuery,
    recurringSummaryQuery,
  ] = useQueries({
    queries: [
      {
        queryKey: dashboardQueryKeys.overview(period),
        queryFn: () => getDashboardOverview(period),
      },
      {
        queryKey: dashboardQueryKeys.spendTrend,
        queryFn: getDashboardSpendTrend,
      },
      {
        queryKey: dashboardQueryKeys.cashflowDaily,
        queryFn: getDashboardCashflowDaily,
      },
      {
        queryKey: dashboardQueryKeys.topMerchants(period),
        queryFn: () => getDashboardTopMerchants(period),
      },
      {
        queryKey: dashboardQueryKeys.topCategories(period),
        queryFn: () => getDashboardTopCategories(period),
      },
      {
        queryKey: dashboardQueryKeys.anomaliesSummary,
        queryFn: getDashboardAnomaliesSummary,
      },
      {
        queryKey: dashboardQueryKeys.recurringSummary,
        queryFn: getDashboardRecurringSummary,
      },
    ],
  })

  return {
    anomaliesSummaryQuery,
    cashflowDailyQuery,
    overviewQuery,
    recurringSummaryQuery,
    spendTrendQuery,
    topCategoriesQuery,
    topMerchantsQuery,
  }
}

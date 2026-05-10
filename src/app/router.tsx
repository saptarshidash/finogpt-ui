import { createBrowserRouter, Navigate } from "react-router"
import { AppShell } from "@/components/layout/app-shell"
import { ProtectedRoute } from "@/features/auth/protected-route"
import { PublicOnlyRoute } from "@/features/auth/public-only-route"
import { AnalyticsPage } from "@/pages/analytics-page"
import {
  CategoryDetailPage,
  CategorySummaryPage,
  EntityDetailPage,
  EntitySummaryPage,
} from "@/pages/dimension-pages"
import { DashboardPage } from "@/pages/dashboard-page"
import { IngestionJobPage } from "@/pages/ingestion-job-page"
import { IngestionPage } from "@/pages/ingestion-page"
import { LoginPage } from "@/pages/login-page"
import { AlertsPage } from "@/pages/alerts-page"
import { AskAiPage } from "@/pages/ask-ai-page"
import { RecurringPage } from "@/pages/recurring-page"
import { SettingsPage } from "@/pages/settings-page"
import { SignupPage } from "@/pages/signup-page"
import { TransactionsPage } from "@/pages/transactions-page"

export const appRouter = createBrowserRouter(
  [
    {
      element: <PublicOnlyRoute />,
      children: [
        {
          path: "/login",
          element: <LoginPage />,
        },
        {
          path: "/signup",
          element: <SignupPage />,
        },
      ],
    },
    {
      path: "/",
      element: <ProtectedRoute />,
      children: [
        {
          element: <AppShell />,
          children: [
            {
              index: true,
              element: <Navigate to="/dashboard" replace />,
            },
            {
              path: "dashboard",
              element: <DashboardPage />,
            },
            {
              path: "ingestion",
              element: <IngestionPage />,
            },
            {
              path: "ingestion/:jobId",
              element: <IngestionJobPage />,
            },
            {
              path: "transactions",
              element: <TransactionsPage />,
            },
            {
              path: "analytics",
              element: <AnalyticsPage />,
            },
            {
              path: "entities",
              element: <EntitySummaryPage />,
            },
            {
              path: "entities/:entityId",
              element: <EntityDetailPage />,
            },
            {
              path: "categories",
              element: <CategorySummaryPage />,
            },
            {
              path: "categories/:categoryId",
              element: <CategoryDetailPage />,
            },
            {
              path: "alerts",
              element: <AlertsPage />,
            },
            {
              path: "recurring",
              element: <RecurringPage />,
            },
            {
              path: "ask-ai",
              element: <AskAiPage />,
            },
            {
              path: "settings",
              element: <SettingsPage />,
            },
          ],
        },
      ],
    },
    {
      path: "*",
      element: <Navigate to="/dashboard" replace />,
    },
  ],
  { basename: "/finogpt" },
)

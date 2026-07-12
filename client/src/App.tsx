import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth-context";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LoginPage } from "./features/auth/LoginPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { EnvironmentalPage } from "./features/environmental/EnvironmentalPage";
import { SocialPage } from "./features/social/SocialPage";
import { GamificationPage } from "./features/gamification/GamificationPage";
import { GovernancePage } from "./features/governance/GovernancePage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { ReportsPage } from "./features/reports/ReportsPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="/environmental" element={<EnvironmentalPage />} />
            <Route path="/social" element={<SocialPage />} />
            <Route path="/governance" element={<GovernancePage />} />
            <Route path="/gamification" element={<GamificationPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;

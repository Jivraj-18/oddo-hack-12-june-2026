import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth-context";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { ModulePage } from "./components/layout/ModulePage";
import { LoginPage } from "./features/auth/LoginPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route
              path="/environmental"
              element={
                <ModulePage
                  title="Environmental"
                  tabs={["Emission Factors", "Product ESG Profiles", "Carbon Transactions", "Environmental Goals"]}
                />
              }
            />
            <Route
              path="/social"
              element={<ModulePage title="Social" tabs={["CSR Activities", "Employee Participation", "Diversity Dashboard"]} />}
            />
            <Route
              path="/governance"
              element={<ModulePage title="Governance" tabs={["Policies", "Policy Acknowledgements", "Audits", "Compliance Issues"]} />}
            />
            <Route
              path="/gamification"
              element={<ModulePage title="Gamification" tabs={["Challenges", "Challenge Participation", "Badges", "Rewards", "Leaderboard"]} />}
            />
            <Route
              path="/reports"
              element={<ModulePage title="Reports" tabs={["Environmental", "Social", "Governance", "ESG Summary", "Custom Builder"]} />}
            />
            <Route
              path="/settings"
              element={<ModulePage title="Settings" tabs={["Departments", "Categories", "ESG Configuration", "Notification Settings"]} />}
            />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;

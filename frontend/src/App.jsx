import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import Incidents from "./pages/Incidents";
import IncidentDetails from "./pages/IncidentDetails";
import ModelComparison from "./pages/ModelComparison";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Users from "./pages/Users";
import KnowledgeBase from "./pages/KnowledgeBase";
import InvestigationHistory from "./pages/InvestigationHistory";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/login"
          element={<AuthPage key="login" mode="login" />}
        />

        <Route
          path="/register"
          element={<AuthPage key="register" mode="register" />}
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />

            <Route path="incidents" element={<Incidents />} />

            <Route
              path="incidents/:incidentId"
              element={<IncidentDetails />}
            />

            <Route
              path="model-comparison"
              element={<ModelComparison />}
            />

            <Route path="investigation-history" element={<InvestigationHistory />} />
            <Route path="knowledge-base" element={<KnowledgeBase />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
            <Route path="users" element={<Users />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
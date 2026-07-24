import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { HomePage } from "./pages/HomePage";
import { DiagnosticoPage } from "./pages/DiagnosticoPage";
import { PublicSmartFormPage } from "./pages/PublicSmartFormPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminLeadsPage } from "./pages/admin/AdminLeadsPage";
import { AdminLeadDetailPage } from "./pages/admin/AdminLeadDetailPage";
import { AdminPagesPage } from "./pages/admin/AdminPagesPage";
import { AdminWhatsappPage } from "./pages/admin/AdminWhatsappPage";
import { AdminDeliveriesPage } from "./pages/admin/AdminDeliveriesPage";
import { AdminFlowsPage } from "./pages/admin/AdminFlowsPage";
import { AdminOnboardingPage } from "./pages/admin/AdminOnboardingPage";
import { SmartFormsListPage } from "./pages/admin/smart-forms/SmartFormsListPage";
import { SmartTemplatesPage } from "./pages/admin/smart-forms/SmartTemplatesPage";
import { SmartLeadsPage } from "./pages/admin/smart-forms/SmartLeadsPage";
import { SmartConfigPage } from "./pages/admin/smart-forms/SmartConfigPage";
import { SmartFormBuilderPage } from "./pages/admin/smart-forms/SmartFormBuilderPage";
import { SmartFormsDashboardPage } from "./pages/admin/smart-forms/SmartFormsDashboardPage";
import { SmartLeadDetailPage } from "./pages/admin/smart-forms/SmartLeadDetailPage";
import { WorkspacePage } from "./pages/admin/account/WorkspacePage";
import { UsersPage } from "./pages/admin/account/UsersPage";
import { RolesPage } from "./pages/admin/account/RolesPage";
import { RequirePermission } from "./components/admin/RequirePermission";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/diagnostico" element={<DiagnosticoPage />} />
        <Route path="/f/:slug" element={<PublicSmartFormPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<SmartFormsDashboardPage />} />

          {/* Smart Forms */}
          <Route
            path="forms"
            element={
              <RequirePermission permission="forms.read">
                <SmartFormsListPage />
              </RequirePermission>
            }
          />
          <Route path="forms/dashboard" element={<Navigate to="/admin" replace />} />
          <Route
            path="forms/templates"
            element={
              <RequirePermission permission="forms.read">
                <SmartTemplatesPage />
              </RequirePermission>
            }
          />
          <Route
            path="forms/leads"
            element={
              <RequirePermission permission="leads.read">
                <SmartLeadsPage />
              </RequirePermission>
            }
          />
          <Route
            path="forms/leads/:leadId"
            element={
              <RequirePermission permission="leads.read">
                <SmartLeadDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="forms/config"
            element={
              <RequirePermission permission="settings.read">
                <SmartConfigPage />
              </RequirePermission>
            }
          />
          <Route
            path="forms/:id"
            element={
              <RequirePermission permission="forms.write">
                <SmartFormBuilderPage />
              </RequirePermission>
            }
          />

          {/* Conta */}
          <Route path="workspace" element={<WorkspacePage />} />
          <Route
            path="users"
            element={
              <RequirePermission permission="users.manage">
                <UsersPage />
              </RequirePermission>
            }
          />
          <Route
            path="roles"
            element={
              <RequirePermission permission="roles.manage">
                <RolesPage />
              </RequirePermission>
            }
          />

          {/* Instalação */}
          <Route
            path="marca"
            element={
              <RequirePermission permission="settings.write">
                <AdminOnboardingPage />
              </RequirePermission>
            }
          />
          <Route
            path="whatsapp"
            element={
              <RequirePermission permission="settings.write">
                <AdminWhatsappPage />
              </RequirePermission>
            }
          />

          {/* Legado */}
          <Route
            path="legacy/leads"
            element={
              <RequirePermission permission="leads.read">
                <AdminLeadsPage />
              </RequirePermission>
            }
          />
          <Route
            path="legacy/leads/:id"
            element={
              <RequirePermission permission="leads.read">
                <AdminLeadDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="legacy/pages"
            element={
              <RequirePermission permission="legacy.access">
                <AdminPagesPage />
              </RequirePermission>
            }
          />
          <Route
            path="legacy/flows"
            element={
              <RequirePermission permission="legacy.access">
                <AdminFlowsPage />
              </RequirePermission>
            }
          />
          <Route
            path="legacy/deliveries"
            element={
              <RequirePermission permission="legacy.access">
                <AdminDeliveriesPage />
              </RequirePermission>
            }
          />

          {/* Redirects dos caminhos antigos */}
          <Route path="leads" element={<Navigate to="/admin/legacy/leads" replace />} />
          <Route path="leads/:id" element={<Navigate to="/admin/legacy/leads" replace />} />
          <Route path="pages" element={<Navigate to="/admin/legacy/pages" replace />} />
          <Route path="flows" element={<Navigate to="/admin/legacy/flows" replace />} />
          <Route path="deliveries" element={<Navigate to="/admin/legacy/deliveries" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="top-center" />
    </BrowserRouter>
  );
}

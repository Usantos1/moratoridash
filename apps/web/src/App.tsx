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
          <Route path="leads" element={<AdminLeadsPage />} />
          <Route path="leads/:id" element={<AdminLeadDetailPage />} />
          <Route path="marca" element={<AdminOnboardingPage />} />
          <Route path="pages" element={<AdminPagesPage />} />
          <Route path="whatsapp" element={<AdminWhatsappPage />} />
          <Route path="flows" element={<AdminFlowsPage />} />
          <Route path="deliveries" element={<AdminDeliveriesPage />} />
          <Route path="forms" element={<SmartFormsListPage />} />
          <Route path="forms/dashboard" element={<SmartFormsDashboardPage />} />
          <Route path="forms/templates" element={<SmartTemplatesPage />} />
          <Route path="forms/leads" element={<SmartLeadsPage />} />
          <Route path="forms/leads/:leadId" element={<SmartLeadDetailPage />} />
          <Route path="forms/config" element={<SmartConfigPage />} />
          <Route path="forms/:id" element={<SmartFormBuilderPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="top-center" />
    </BrowserRouter>
  );
}

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { HomePage } from "./pages/HomePage";
import { DiagnosticoPage } from "./pages/DiagnosticoPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminLeadsPage } from "./pages/admin/AdminLeadsPage";
import { AdminLeadDetailPage } from "./pages/admin/AdminLeadDetailPage";
import { AdminPagesPage } from "./pages/admin/AdminPagesPage";
import { AdminWhatsappPage } from "./pages/admin/AdminWhatsappPage";
import { AdminDeliveriesPage } from "./pages/admin/AdminDeliveriesPage";
import { AdminFlowsPage } from "./pages/admin/AdminFlowsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/diagnostico" element={<DiagnosticoPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminLeadsPage />} />
          <Route path="leads/:id" element={<AdminLeadDetailPage />} />
          <Route path="pages" element={<AdminPagesPage />} />
          <Route path="whatsapp" element={<AdminWhatsappPage />} />
          <Route path="flows" element={<AdminFlowsPage />} />
          <Route path="deliveries" element={<AdminDeliveriesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="top-center" />
    </BrowserRouter>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import CombinedDashboard from "@/pages/CombinedDashboard";
import CotDashboard from "@/pages/CotDashboard";
import SentimentDashboard from "@/pages/SentimentDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<CombinedDashboard />} />
          <Route path="/cot" element={<CotDashboard />} />
          <Route path="/sentiment" element={<SentimentDashboard />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

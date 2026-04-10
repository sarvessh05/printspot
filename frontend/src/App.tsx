import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import LandingPage from "./pages/LandingPage";
import OrderPage from "./pages/OrderPage";
import PaymentPage from "./pages/PaymentPage";
import SuccessPage from "./pages/SuccessPage";
import KioskPage from "./pages/KioskPage";
import AdminDashboard from "./pages/AdminDashboard";
import AboutUs from "./pages/AboutUs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import HelpButton from "./components/HelpButton";
import { FilesProvider } from "./context/FilesContext";

import { useEffect } from "react";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/upload" element={<OrderPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/kiosk" element={<KioskPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  useEffect(() => {
    // Wake up the backend (Render Free Tier "Sleeping Beauty")
    const backendUrl = import.meta.env.VITE_EC2_IP;
    if (backendUrl) {
      console.log("🚀 Waking up backend at:", backendUrl);
      fetch(`${backendUrl}/health`).catch(() => {
        // Silently ignore errors - we just need to hit the server
      });
    }
  }, []);

  return (
    <FilesProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <HelpButton />
            <Toaster />
            <Sonner />
            <AnimatedRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </FilesProvider>
  );
};

export default App;

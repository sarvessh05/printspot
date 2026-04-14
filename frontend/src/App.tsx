import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import { lazy, Suspense, useEffect } from "react";
import HelpButton from "./components/HelpButton";
import { FilesProvider } from "./context/FilesContext";

// Lazy load pages for better performance
const LandingPage = lazy(() => import("./pages/LandingPage"));
const OrderPage = lazy(() => import("./pages/OrderPage"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const SuccessPage = lazy(() => import("./pages/SuccessPage"));
const KioskPage = lazy(() => import("./pages/KioskPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading component for Suspense
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
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


import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TourProvider } from "@/contexts/TourContext";
import { GuidedTour } from "@/components/GuidedTour";
import { AppLockScreen } from "@/components/AppLockScreen";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Ledger from "./pages/Ledger";
import Inventory from "./pages/Inventory";
import Insights from "./pages/Insights";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { db, initializeSettings } from "./lib/db";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      await initializeSettings();
      const settings = await db.settings.toArray();
      const completed = settings[0]?.onboardingCompleted || false;
      const localOnboarding = localStorage.getItem('onboardingCompleted');
      setOnboardingComplete(completed || localOnboarding === 'true');
    };
    checkOnboarding();

    // Check if app lock is enabled
    const lockEnabled = localStorage.getItem('appLockEnabled') === 'true';
    if (lockEnabled && isAuthenticated) {
      setIsLocked(true);
    }
  }, [isAuthenticated]);

  if (onboardingComplete === null) {
    return null; // Loading state
  }

  if (isLocked && isAuthenticated) {
    return <AppLockScreen onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <>
      <Routes>
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Navigate to="/ledger" replace />
            ) : onboardingComplete ? (
              <Navigate to="/login" replace />
            ) : (
              <Onboarding />
            )
          } 
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route 
          path="/ledger" 
          element={isAuthenticated ? <Ledger /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/inventory" 
          element={isAuthenticated ? <Inventory /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/insights" 
          element={isAuthenticated ? <Insights /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/profile" 
          element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />} 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <GuidedTour />
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <TourProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppContent />
                </BrowserRouter>
              </TooltipProvider>
            </TourProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;

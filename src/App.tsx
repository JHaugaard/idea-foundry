import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import TagLibrary from "./pages/TagLibrary";
import NotFound from "./pages/NotFound";

const App = () => {
  const queryClient = React.useMemo(() => new QueryClient(), []);
  const router = React.useMemo(
    () =>
      createBrowserRouter(
        [
          { path: "/", element: <Index /> },
          { path: "/auth", element: <Auth /> },
          { path: "/tags", element: <TagLibrary /> },
          { path: "*", element: <NotFound /> },
        ],
        {
          future: {
            v7_relativeSplatPath: true,
          },
        }
      ),
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

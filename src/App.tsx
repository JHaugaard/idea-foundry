import React, { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CommandPalette } from "@/components/CommandPalette";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import TagLibrary from "./pages/TagLibrary";
import LinkExplorer from "./pages/LinkExplorer";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";

const App = () => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const queryClient = React.useMemo(() => new QueryClient(), []);

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      metaKey: true,
      action: () => setIsCommandPaletteOpen(true),
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => setIsCommandPaletteOpen(true),
    }
  ]);
  const router = React.useMemo(
    () =>
      createBrowserRouter(
        [
          { path: "/", element: <Index /> },
          { path: "/auth", element: <Auth /> },
          { path: "/signup", element: <Signup /> },
          { path: "/tags", element: <TagLibrary /> },
          { path: "/links", element: <LinkExplorer /> },
          { path: "/analytics", element: <Analytics /> },
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
          <CommandPalette 
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
          />
          <Toaster />
          <Sonner />
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

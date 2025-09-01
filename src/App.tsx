import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthContextProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { EnhancedErrorBoundary } from "@/components/EnhancedErrorBoundary";

import Auth from "@/pages/Auth";
import Signup from "@/pages/Signup";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import Analytics from "@/pages/Analytics";
import LinkExplorer from "@/pages/LinkExplorer";
import TagLibrary from "@/pages/TagLibrary";
import AppSidebar from "@/components/AppSidebar";
import NoteView from "@/pages/NoteView";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContextProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Toaster />
            <EnhancedErrorBoundary>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/notes/:slug" element={<NoteView />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/link-explorer" element={<LinkExplorer />} />
                <Route path="/tag-library" element={<TagLibrary />} />
                <Route path="/" element={<Index />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </EnhancedErrorBoundary>
          </div>
        </BrowserRouter>
      </AuthContextProvider>
    </QueryClientProvider>
  );
}

export default App;

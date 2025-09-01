
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { AppSidebar } from '@/components/AppSidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import Auth from '@/pages/Auth'
import Signup from '@/pages/Signup'
import Index from '@/pages/Index'
import NoteView from '@/pages/NoteView'
import Analytics from '@/pages/Analytics'
import TagLibrary from '@/pages/TagLibrary'
import LinkExplorer from '@/pages/LinkExplorer'
import NotFound from '@/pages/NotFound'

const queryClient = new QueryClient()

interface ProtectedRouteProps {
  children: React.ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={
              <ProtectedRoute>
                <SidebarProvider>
                  <AppSidebar />
                  <SidebarInset>
                    <Index />
                  </SidebarInset>
                </SidebarProvider>
              </ProtectedRoute>
            } />
            <Route path="/notes/:slug" element={
              <ProtectedRoute>
                <SidebarProvider>
                  <AppSidebar />
                  <SidebarInset>
                    <NoteView />
                  </SidebarInset>
                </SidebarProvider>
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <SidebarProvider>
                  <AppSidebar />
                  <SidebarInset>
                    <Analytics />
                  </SidebarInset>
                </SidebarProvider>
              </ProtectedRoute>
            } />
            <Route path="/tags" element={
              <ProtectedRoute>
                <SidebarProvider>
                  <AppSidebar />
                  <SidebarInset>
                    <TagLibrary />
                  </SidebarInset>
                </SidebarProvider>
              </ProtectedRoute>
            } />
            <Route path="/links" element={
              <ProtectedRoute>
                <SidebarProvider>
                  <AppSidebar />
                  <SidebarInset>
                    <LinkExplorer />
                  </SidebarInset>
                </SidebarProvider>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App

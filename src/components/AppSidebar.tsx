import React from 'react';
import { NavLink, useLocation } from "react-router-dom";
import { 
  Tag, 
  Network, 
  BarChart3 
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

import UserMenu from '@/components/UserMenu';

const navigationItems = [
  { title: "Link Explorer", url: "/links", icon: Network },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Tag Manager", url: "/tags", icon: Tag },
];

interface AppSidebarProps {
  selectedNotes?: Array<{ id: string; title: string; tags: string[] }>;
}

export function AppSidebar({ selectedNotes = [] }: AppSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();

  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => location.pathname === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-80"} collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <SidebarTrigger className="h-8 w-8 p-1 text-sidebar-foreground hover:bg-sidebar-accent border border-sidebar-border rounded-md" />
          {!isCollapsed && (
            <div className="flex-1 ml-3">
              <UserMenu />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
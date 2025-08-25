import React, { useState } from 'react';
import { NavLink, useLocation } from "react-router-dom";
import { 
  Tag, 
  Network, 
  BarChart3, 
  Sparkles, 
  Zap, 
  Settings,
  RefreshCw,
  KeyRound,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Menu
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

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import UserMenu from '@/components/UserMenu';
import { useTags } from '@/hooks/useTags';
import { useTagAutomation } from '@/hooks/useTagAutomation';
import BatchTagOperations from '@/components/BatchTagOperations';
import TagAutomationPanel from '@/components/TagAutomationPanel';
import TokenManagement from '@/components/TokenManagement';

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
  const { tags, tagStats, isLoading, invalidateTags } = useTags();
  const { operationHistory, clearHistory } = useTagAutomation();
  
  const [showBatchOperations, setShowBatchOperations] = useState(false);
  const [showAutomationPanel, setShowAutomationPanel] = useState(false);
  const [isTagSectionOpen, setIsTagSectionOpen] = useState(false);

  const isCollapsed = state === "collapsed";
  const totalNotes = tagStats?.reduce((sum, stat) => sum + stat.count, 0) || 0;
  const averageTagsPerNote = totalNotes > 0 ? (tags.length / totalNotes).toFixed(1) : '0';
  
  const popularTags = tagStats
    ?.sort((a, b) => b.count - a.count)
    .slice(0, 5) || [];

  const recentOperations = operationHistory.slice(0, 3);

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

        {/* Tag Management Section */}
        <SidebarGroup>
          <Collapsible 
            open={isTagSectionOpen} 
            onOpenChange={setIsTagSectionOpen}
            className="space-y-2"
          >
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 px-2 py-1 rounded-md">
                <span className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  {!isCollapsed && "Tag Management"}
                </span>
                {!isCollapsed && (
                  isTagSectionOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-4 px-2">
              {!isCollapsed && (
                <>

                  {/* Tag Automation Tabs */}
                  <Tabs defaultValue="automation" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-sidebar-accent">
                      <TabsTrigger value="automation" className="flex items-center gap-1 text-xs">
                        <Sparkles className="h-3 w-3" />
                        Tags
                      </TabsTrigger>
                      <TabsTrigger value="tokens" className="flex items-center gap-1 text-xs">
                        <KeyRound className="h-3 w-3" />
                        API
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="automation" className="space-y-3 mt-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-sidebar-foreground">Automation</h4>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={invalidateTags}
                          disabled={isLoading}
                          className="h-6 w-6 p-0 text-sidebar-foreground hover:bg-sidebar-accent"
                        >
                          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>

                      {/* Quick Stats */}
                      <Card className="bg-sidebar-accent border-sidebar-border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs text-sidebar-foreground">Quick Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-sidebar-foreground">Tags</span>
                            <Badge variant="secondary" className="h-5 text-xs bg-sidebar-primary text-sidebar-primary-foreground">
                              {tags.length}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-sidebar-foreground">Notes</span>
                            <Badge variant="secondary" className="h-5 text-xs bg-sidebar-primary text-sidebar-primary-foreground">
                              {totalNotes}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-sidebar-foreground">Avg/Note</span>
                            <Badge variant="outline" className="h-5 text-xs border-sidebar-border text-sidebar-foreground">
                              {averageTagsPerNote}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Popular Tags */}
                      {popularTags.length > 0 && (
                        <Card className="bg-sidebar-accent border-sidebar-border">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-xs text-sidebar-foreground flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Popular Tags
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {popularTags.slice(0, 3).map((tagStat) => {
                              const percentage = totalNotes > 0 ? (tagStat.count / totalNotes) * 100 : 0;
                              return (
                                <div key={tagStat.tag} className="space-y-1">
                                  <div className="flex justify-between items-center text-xs">
                                    <Badge 
                                      variant="outline" 
                                      className="border-sidebar-border text-sidebar-foreground max-w-16 truncate text-xs h-4"
                                    >
                                      {tagStat.tag}
                                    </Badge>
                                    <span className="text-sidebar-foreground text-xs">{tagStat.count}</span>
                                  </div>
                                  <Progress 
                                    value={percentage} 
                                    className="h-1 bg-sidebar-border [&>div]:bg-sidebar-primary" 
                                  />
                                </div>
                              );
                            })}
                          </CardContent>
                        </Card>
                      )}

                      {/* Smart Actions */}
                      <Card className="bg-sidebar-accent border-sidebar-border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs text-sidebar-foreground flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Smart Actions
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowAutomationPanel(true)}
                            className="w-full justify-start h-7 text-xs border-sidebar-border text-sidebar-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            AI Suggestions
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowBatchOperations(true)}
                            disabled={selectedNotes.length === 0}
                            className="w-full justify-start h-7 text-xs border-sidebar-border text-sidebar-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Batch Ops
                            {selectedNotes.length > 0 && (
                              <Badge className="ml-1 h-4 text-xs bg-sidebar-primary text-sidebar-primary-foreground">
                                {selectedNotes.length}
                              </Badge>
                            )}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Recent Operations */}
                      {recentOperations.length > 0 && (
                        <Card className="bg-sidebar-accent border-sidebar-border">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-xs text-sidebar-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Recent
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {recentOperations.slice(0, 2).map((operation) => (
                              <div key={operation.id} className="text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sidebar-foreground/80 capitalize text-xs">
                                    {operation.type}
                                  </span>
                                  <Badge variant="outline" className="h-4 text-xs border-sidebar-border text-sidebar-foreground">
                                    {operation.preview.affected}
                                  </Badge>
                                </div>
                                <div className="text-sidebar-foreground/60 truncate text-xs">
                                  {operation.tags.slice(0, 1).join(', ')}
                                  {operation.tags.length > 1 && `, +${operation.tags.length - 1}`}
                                </div>
                              </div>
                            ))}
                            
                            <Separator className="bg-sidebar-border" />
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={clearHistory}
                              className="w-full h-6 text-xs text-sidebar-foreground/70 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                            >
                              Clear History
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="tokens" className="mt-3">
                      <TokenManagement />
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

      {/* Dialogs */}
      <BatchTagOperations
        open={showBatchOperations}
        onOpenChange={setShowBatchOperations}
        notes={selectedNotes}
        onCompleted={() => setShowBatchOperations(false)}
      />

      {showAutomationPanel && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <TagAutomationPanel
              onTagsApplied={() => setShowAutomationPanel(false)}
            />
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowAutomationPanel(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Sidebar>
  );
}
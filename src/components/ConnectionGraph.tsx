import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useConnectionGraph, TimeFilter } from '@/hooks/useLinkAnalytics';

interface ConnectionGraphProps {
  timeFilter: TimeFilter;
  maxNodes?: number;
}

export const ConnectionGraph: React.FC<ConnectionGraphProps> = ({ timeFilter, maxNodes = 20 }) => {
  const { data: graph, isLoading } = useConnectionGraph(timeFilter, maxNodes);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network Graph</CardTitle>
          <CardDescription>
            Visual representation of note connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full animate-pulse bg-muted rounded flex items-center justify-center">
            <span className="text-muted-foreground">Loading network...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network Graph</CardTitle>
          <CardDescription>
            Visual representation of note connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No connected notes found for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  // Simple circular layout for nodes
  const centerX = 300;
  const centerY = 200;
  const radius = 150;
  const angleStep = (2 * Math.PI) / graph.nodes.length;

  const nodesWithPositions = graph.nodes.map((node, index) => {
    const angle = index * angleStep;
    return {
      ...node,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      size: Math.max(8, Math.min(20, node.connectionCount * 2)),
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Graph</CardTitle>
        <CardDescription>
          Visual representation of note connections ({graph.nodes.length} notes, {graph.edges.length} connections)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full overflow-hidden rounded-lg border bg-background">
          <svg width="100%" height="100%" viewBox="0 0 600 400" className="w-full h-full">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="hsl(var(--muted-foreground))"
                />
              </marker>
            </defs>
            
            {/* Render edges */}
            {graph.edges.map((edge, index) => {
              const sourceNode = nodesWithPositions.find(n => n.id === edge.source);
              const targetNode = nodesWithPositions.find(n => n.id === edge.target);
              
              if (!sourceNode || !targetNode) return null;
              
              return (
                <line
                  key={index}
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth="2"
                  strokeOpacity={0.6}
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            
            {/* Render nodes */}
            {nodesWithPositions.map((node) => (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size}
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                  strokeWidth="2"
                  className="hover:fill-primary/80 cursor-pointer transition-colors"
                />
                <text
                  x={node.x}
                  y={node.y + node.size + 15}
                  textAnchor="middle"
                  className="text-xs fill-foreground"
                  style={{ fontSize: '10px' }}
                >
                  {node.title.length > 15 ? `${node.title.substring(0, 15)}...` : node.title}
                </text>
              </g>
            ))}
          </svg>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span>Note (size = connections)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-0.5 bg-muted-foreground"></div>
              <span>Link</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
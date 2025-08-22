import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useInvitationTokens, CreateTokenData } from '@/hooks/useInvitationTokens';
import { 
  KeyRound, 
  Plus, 
  Copy, 
  Mail, 
  Calendar, 
  Users, 
  Ban,
  CheckCircle2,
  XCircle 
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function TokenManagement() {
  const { 
    tokens, 
    isLoading, 
    createToken, 
    isCreating, 
    deactivateToken,
    isDeactivating 
  } = useInvitationTokens();
  const { toast } = useToast();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState<CreateTokenData>({
    email: '',
    max_uses: 1,
  });

  const handleCreateToken = () => {
    const data: CreateTokenData = {
      ...formData,
      expires_at: formData.expires_at || 
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days default
    };
    
    if (data.email && !data.email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    createToken(data);
    setShowCreateDialog(false);
    setFormData({ email: '', max_uses: 1 });
  };

  const copyToClipboard = async (token: string) => {
    const signupUrl = `${window.location.origin}/signup?token=${token}`;
    try {
      await navigator.clipboard.writeText(signupUrl);
      toast({
        title: 'Copied to clipboard',
        description: 'Signup URL has been copied to your clipboard.',
      });
    } catch (err) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy URL to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const activeTokens = tokens.filter(t => t.is_active);
  const usedTokens = tokens.filter(t => !t.is_active || (t.current_uses || 0) >= (t.max_uses || 1));

  if (isLoading) {
    return <div className="p-4 text-center text-sidebar-foreground/70">Loading tokens...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sidebar-foreground flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          Invitation Tokens
        </h3>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="border-sidebar-border">
              <Plus className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Invitation Token</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="max_uses">Max Uses</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) || 1 })}
                />
              </div>
              
              <div>
                <Label htmlFor="expires_at">Expires (optional)</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={formData.expires_at?.slice(0, 16)}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                  })}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleCreateToken} 
                  disabled={isCreating}
                  className="flex-1"
                >
                  {isCreating ? 'Creating...' : 'Create Token'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Summary */}
      <Card className="bg-sidebar-accent border-sidebar-border">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-sidebar-foreground">{activeTokens.length}</div>
              <div className="text-sidebar-foreground/70">Active</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-sidebar-foreground">{usedTokens.length}</div>
              <div className="text-sidebar-foreground/70">Used/Expired</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Tokens */}
      {activeTokens.length > 0 && (
        <Card className="bg-sidebar-accent border-sidebar-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-sidebar-foreground">Active Tokens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeTokens.slice(0, 3).map((token) => (
              <div key={token.id} className="space-y-2 p-2 rounded border border-sidebar-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {token.email ? (
                      <Mail className="h-3 w-3 text-sidebar-foreground/70" />
                    ) : (
                      <Users className="h-3 w-3 text-sidebar-foreground/70" />
                    )}
                    <span className="text-xs text-sidebar-foreground/80 truncate max-w-20">
                      {token.email || 'Open invite'}
                    </span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className="border-sidebar-border text-sidebar-foreground text-xs"
                  >
                    {token.current_uses || 0}/{token.max_uses || 1}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1 text-xs text-sidebar-foreground/60">
                  <Calendar className="h-3 w-3" />
                  Expires {format(new Date(token.expires_at), 'MMM d')}
                </div>
                
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(token.token)}
                    className="h-6 px-2 text-xs border-sidebar-border hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isDeactivating}
                        className="h-6 px-2 text-xs border-sidebar-border hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Ban className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate Token</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to deactivate this invitation token? 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deactivateToken(token.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Deactivate
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            
            {activeTokens.length > 3 && (
              <div className="text-center text-xs text-sidebar-foreground/60">
                +{activeTokens.length - 3} more tokens
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {usedTokens.length > 0 && (
        <Card className="bg-sidebar-accent border-sidebar-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-sidebar-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {usedTokens.slice(0, 2).map((token) => (
              <div key={token.id} className="flex items-center gap-2 text-xs">
                {token.used_at ? (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                <span className="text-sidebar-foreground/70 truncate flex-1">
                  {token.email || `Token ${token.token.slice(0, 8)}...`}
                </span>
                <span className="text-sidebar-foreground/50">
                  {token.used_at ? 
                    format(new Date(token.used_at), 'MMM d') : 
                    'Expired'
                  }
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tokens.length === 0 && (
        <Card className="bg-sidebar-accent border-sidebar-border">
          <CardContent className="pt-6 text-center">
            <KeyRound className="h-8 w-8 mx-auto mb-2 text-sidebar-foreground/50" />
            <p className="text-sm text-sidebar-foreground/70 mb-3">
              No invitation tokens yet
            </p>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
            >
              Create First Token
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { ExternalLink } from 'lucide-react';

interface GoogleDriveSetupProps {
  onComplete?: () => void;
}

export const GoogleDriveSetup: React.FC<GoogleDriveSetupProps> = ({ onComplete }) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const { connectGoogleDrive, isConnecting, hasStoredCredentials, clearStoredCredentials } = useGoogleDrive();

  const handleConnect = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      return;
    }
    
    try {
      await connectGoogleDrive(clientId, clientSecret);
      onComplete?.();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleClearCredentials = () => {
    clearStoredCredentials();
    setClientId('');
    setClientSecret('');
  };

  if (hasStoredCredentials()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google Drive Connected</CardTitle>
          <CardDescription>
            Your Google Drive credentials are stored locally.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            onClick={handleClearCredentials}
          >
            Clear Credentials
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect Google Drive</CardTitle>
        <CardDescription>
          Enter your Google OAuth credentials to enable Google Drive uploads.
          <a 
            href="https://console.cloud.google.com/apis/credentials" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline ml-1"
          >
            Get credentials <ExternalLink className="h-3 w-3" />
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="clientId">Client ID</Label>
          <Input
            id="clientId"
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Your Google OAuth Client ID"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="clientSecret">Client Secret</Label>
          <Input
            id="clientSecret"
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="Your Google OAuth Client Secret"
          />
        </div>

        <div className="text-sm text-muted-foreground">
          <p>To get your credentials:</p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Go to Google Cloud Console</li>
            <li>Create or select a project</li>
            <li>Enable the Google Drive API</li>
            <li>Create OAuth 2.0 credentials</li>
            <li>Add authorized redirect URI: <code className="text-xs bg-muted px-1 rounded">https://lvnjmmazkftcjqxstoyn.supabase.co/functions/v1/google-drive</code></li>
          </ol>
        </div>
        
        <Button 
          onClick={handleConnect}
          disabled={!clientId.trim() || !clientSecret.trim() || isConnecting}
          className="w-full"
        >
          {isConnecting ? 'Connecting...' : 'Connect Google Drive'}
        </Button>
      </CardContent>
    </Card>
  );
};
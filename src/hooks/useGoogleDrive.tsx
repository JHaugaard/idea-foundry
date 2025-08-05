import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useGoogleDrive = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const getStoredCredentials = () => {
    const clientId = localStorage.getItem('google_drive_client_id');
    const clientSecret = localStorage.getItem('google_drive_client_secret');
    return { clientId, clientSecret };
  };

  const setStoredCredentials = (clientId: string, clientSecret: string) => {
    localStorage.setItem('google_drive_client_id', clientId);
    localStorage.setItem('google_drive_client_secret', clientSecret);
  };

  const connectGoogleDrive = async (clientId?: string, clientSecret?: string) => {
    setIsConnecting(true);
    try {
      const credentials = getStoredCredentials();
      const finalClientId = clientId || credentials.clientId;
      const finalClientSecret = clientSecret || credentials.clientSecret;

      if (!finalClientId || !finalClientSecret) {
        throw new Error('Google Drive credentials are required');
      }

      // Store credentials if provided
      if (clientId && clientSecret) {
        setStoredCredentials(clientId, clientSecret);
      }

      const { data, error } = await supabase.functions.invoke('google-drive', {
        body: { 
          action: 'get_auth_url',
          clientId: finalClientId,
          clientSecret: finalClientSecret
        }
      });

      if (error) throw error;

      // Open Google OAuth in a popup
      const popup = window.open(
        data.auth_url,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Listen for the popup to close (user completed auth)
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setIsConnecting(false);
          toast({
            title: "Google Drive Connected",
            description: "You can now save your ideas to Google Drive!",
          });
          // Reload to update the UI
          window.location.reload();
        }
      }, 1000);

    } catch (error: any) {
      console.error('Error connecting to Google Drive:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Google Drive",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const uploadToGoogleDrive = async (title: string, content?: string) => {
    setIsUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-drive', {
        body: { 
          action: 'upload_file',
          title,
          content: content || ''
        }
      });

      if (error) throw error;

      toast({
        title: "Saved to Google Drive",
        description: "Your idea has been backed up to Google Drive!",
      });

      return data;
    } catch (error: any) {
      console.error('Error uploading to Google Drive:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to save to Google Drive",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const listGoogleDriveFiles = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-drive', {
        body: { action: 'list_files' }
      });

      if (error) throw error;
      return data.files;
    } catch (error: any) {
      console.error('Error listing Google Drive files:', error);
      throw error;
    }
  };

  const hasStoredCredentials = () => {
    const { clientId, clientSecret } = getStoredCredentials();
    return !!(clientId && clientSecret);
  };

  const clearStoredCredentials = () => {
    localStorage.removeItem('google_drive_client_id');
    localStorage.removeItem('google_drive_client_secret');
  };

  return {
    connectGoogleDrive,
    uploadToGoogleDrive,
    listGoogleDriveFiles,
    hasStoredCredentials,
    clearStoredCredentials,
    isConnecting,
    isUploading,
  };
};
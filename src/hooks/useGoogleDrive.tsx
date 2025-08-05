import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useGoogleDrive = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const connectGoogleDrive = async () => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-drive', {
        body: { action: 'get_auth_url' }
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

  return {
    connectGoogleDrive,
    uploadToGoogleDrive,
    listGoogleDriveFiles,
    isConnecting,
    isUploading,
  };
};
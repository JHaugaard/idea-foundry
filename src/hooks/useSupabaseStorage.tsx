import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface FileMetadata {
  id: string;
  user_id: string;
  storage_path: string;
  original_name: string;
  file_type: string;
  file_size: number;
  tags: string[];
  metadata: any;
  created_at: string;
  updated_at: string;
}

export const useSupabaseStorage = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const uploadFile = async (file: File, tags: string[] = []) => {
    if (!user) throw new Error('User not authenticated');
    
    setIsUploading(true);
    try {
      // Create file path with user ID folder
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
      const filePath = `${user.id}/${fileName}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Store metadata in database
      const { data: fileMetadata, error: metadataError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          storage_path: filePath,
          original_name: file.name,
          file_type: file.type,
          file_size: file.size,
          tags,
          metadata: {
            uploaded_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (metadataError) throw metadataError;

      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been saved to your collection.`,
      });

      return fileMetadata;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadTextAsFile = async (title: string, content: string, tags: string[] = []) => {
    if (!user) throw new Error('User not authenticated');
    
    setIsUploading(true);
    try {
      // Create text file
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], `${title}.txt`, { type: 'text/plain' });
      
      return await uploadFile(file, tags);
    } catch (error) {
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const listFiles = async (searchQuery?: string, tagFilter?: string[]): Promise<FileMetadata[]> => {
    if (!user) throw new Error('User not authenticated');
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply search filter
      if (searchQuery && searchQuery.trim()) {
        query = query.ilike('original_name', `%${searchQuery.trim()}%`);
      }

      // Apply tag filter
      if (tagFilter && tagFilter.length > 0) {
        query = query.overlaps('tags', tagFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error listing files:', error);
      toast({
        title: "Error loading files",
        description: error.message || "Failed to load files",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = async (fileMetadata: FileMetadata) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase.storage
        .from('user-files')
        .download(fileMetadata.storage_path);

      if (error) throw error;

      // Create download URL and trigger download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileMetadata.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "File downloaded",
        description: `${fileMetadata.original_name} has been downloaded.`,
      });
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download failed",
        description: error.message || "Failed to download file",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteFile = async (fileMetadata: FileMetadata) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove([fileMetadata.storage_path]);

      if (storageError) throw storageError;

      // Delete metadata from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileMetadata.id);

      if (dbError) throw dbError;

      toast({
        title: "File deleted",
        description: `${fileMetadata.original_name} has been deleted.`,
      });
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateFileTags = async (fileId: string, tags: string[]) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const { error } = await supabase
        .from('files')
        .update({ tags })
        .eq('id', fileId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Tags updated",
        description: "File tags have been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error updating tags:', error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update tags",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getFileUrl = async (fileMetadata: FileMetadata) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const { data } = await supabase.storage
        .from('user-files')
        .createSignedUrl(fileMetadata.storage_path, 60); // 1 hour expiry

      return data?.signedUrl || null;
    } catch (error: any) {
      console.error('Error getting file URL:', error);
      return null;
    }
  };

  return {
    uploadFile,
    uploadTextAsFile,
    listFiles,
    downloadFile,
    deleteFile,
    updateFileTags,
    getFileUrl,
    isUploading,
    isLoading,
  };
};
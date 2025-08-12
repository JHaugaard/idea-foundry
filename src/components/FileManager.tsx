import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSupabaseStorage, FileMetadata } from '@/hooks/useSupabaseStorage';
import { Search, Download, Trash2, Eye, File, Image, FileText, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FileManager = () => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const { 
    listFiles, 
    downloadFile, 
    deleteFile, 
    getFileUrl, 
    isLoading 
  } = useSupabaseStorage();
  const { toast } = useToast();

  const loadFiles = async () => {
    try {
      const fileList = await listFiles(searchQuery, selectedTags.length > 0 ? selectedTags : undefined);
      setFiles(fileList);
      
      // Extract all unique tags
      const tags = new Set<string>();
      fileList.forEach(file => {
        file.tags.forEach(tag => tags.add(tag));
      });
      setAllTags(Array.from(tags));
    } catch (error) {
      // Error is handled in the hook
    }
  };

  useEffect(() => {
    loadFiles();
  }, [searchQuery, selectedTags]);

  const handleDownload = async (file: FileMetadata) => {
    try {
      await downloadFile(file);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDelete = async (file: FileMetadata) => {
    if (!confirm(`Are you sure you want to delete "${file.original_name}"?`)) {
      return;
    }
    
    try {
      await deleteFile(file);
      await loadFiles(); // Refresh the list
      toast({
        title: "File deleted",
        description: `${file.original_name} has been deleted successfully.`,
      });
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handlePreview = async (file: FileMetadata) => {
    try {
      const url = await getFileUrl(file);
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      toast({
        title: "Preview failed",
        description: "Could not generate preview for this file.",
        variant: "destructive",
      });
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (fileType === 'text/plain' || fileType.includes('document')) {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Filter by tags:
            </p>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Files List - disabled per request */}
        <div className="text-center py-8">
          <p className="text-muted-foreground">Search coming soon.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileManager;
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Link } from 'lucide-react';
import { toast } from 'sonner';

interface CopyLinkButtonProps {
  noteId: string;
  noteTitle: string;
  noteSlug?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function CopyLinkButton({
  noteId,
  noteTitle,
  noteSlug,
  variant = 'outline',
  size = 'sm',
  showLabel = false,
  className,
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const generateNoteUrl = () => {
    const baseUrl = window.location.origin;
    const path = noteSlug ? `/notes/${noteSlug}` : `/notes/${noteId}`;
    return `${baseUrl}${path}`;
  };

  const generateMarkdownLink = () => {
    const url = generateNoteUrl();
    return `[${noteTitle}](${url})`;
  };

  const copyToClipboard = async (text: string, format: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${format} copied to clipboard`);
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleCopyUrl = () => {
    const url = generateNoteUrl();
    copyToClipboard(url, 'Link');
  };

  const handleCopyMarkdown = () => {
    const markdown = generateMarkdownLink();
    copyToClipboard(markdown, 'Markdown link');
  };

  return (
    <div className="flex gap-1">
      <Button
        variant={variant}
        size={size}
        onClick={handleCopyUrl}
        className={className}
      >
        {copied ? (
          <Check className="h-3 w-3" />
        ) : (
          <Link className="h-3 w-3" />
        )}
        {showLabel && <span className="ml-1">Copy Link</span>}
      </Button>
      
      <Button
        variant="ghost"
        size={size}
        onClick={handleCopyMarkdown}
        title="Copy as Markdown"
        className="px-2"
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function CopyLinkSection({ 
  noteId, 
  noteTitle, 
  noteSlug 
}: { 
  noteId: string; 
  noteTitle: string; 
  noteSlug?: string; 
}) {
  const [copyFormat, setCopyFormat] = useState<'url' | 'markdown'>('url');
  const [copied, setCopied] = useState(false);

  const generateNoteUrl = () => {
    const baseUrl = window.location.origin;
    const path = noteSlug ? `/notes/${noteSlug}` : `/notes/${noteId}`;
    return `${baseUrl}${path}`;
  };

  const generateMarkdownLink = () => {
    const url = generateNoteUrl();
    return `[${noteTitle}](${url})`;
  };

  const handleCopy = async () => {
    const text = copyFormat === 'url' ? generateNoteUrl() : generateMarkdownLink();
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${copyFormat === 'url' ? 'Link' : 'Markdown link'} copied`);
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2">
        <Link className="h-4 w-4" />
        <span className="font-medium text-sm">Share this note</span>
      </div>
      
      <div className="flex gap-2">
        <Button
          variant={copyFormat === 'url' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCopyFormat('url')}
        >
          URL
        </Button>
        <Button
          variant={copyFormat === 'markdown' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCopyFormat('markdown')}
        >
          Markdown
        </Button>
      </div>
      
      <div className="flex gap-2">
        <div className="flex-1 p-2 bg-background border rounded text-xs font-mono text-muted-foreground truncate">
          {copyFormat === 'url' ? generateNoteUrl() : generateMarkdownLink()}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={copied}
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}
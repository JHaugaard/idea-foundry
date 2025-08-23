import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLinkData, useNotePreview, LinkData } from '@/hooks/useLinkData';
import { useLinkNavigation } from '@/hooks/useLinkNavigation';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ExternalLink } from 'lucide-react';

interface LinkifiedContentProps {
  content: string;
  sourceNoteId?: string;
  className?: string;
}

interface ProcessedSegment {
  type: 'text' | 'existing_link' | 'broken_link' | 'unprocessed_bracket';
  content: string;
  linkData?: LinkData;
}

const NotePreviewTooltip: React.FC<{ noteId: string; children: React.ReactNode }> = ({ 
  noteId, 
  children 
}) => {
  const { data: preview, isLoading } = useNotePreview(noteId);

  if (isLoading) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent className="w-80 p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (!preview) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="w-80 p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{preview.title}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {preview.excerpt}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export const LinkifiedContent: React.FC<LinkifiedContentProps> = ({ 
  content, 
  sourceNoteId,
  className = "" 
}) => {
  const { navigateToNote } = useLinkNavigation();
  const { data: linkData = [] } = useLinkData(sourceNoteId);

  const processedSegments = useMemo((): ProcessedSegment[] => {
    if (!content) return [{ type: 'text', content: '' }];

    const segments: ProcessedSegment[] = [];
    let currentIndex = 0;

    // Create a map for quick link lookup by anchor text
    const linkMap = new Map<string, LinkData>();
    linkData.forEach(link => {
      if (link.anchor_text) {
        linkMap.set(link.anchor_text.toLowerCase(), link);
      }
    });

    // Regex patterns
    const bracketPattern = /\[\[([^\]]+)\]\]/g;
    const allMatches: Array<{ start: number; end: number; text: string; type: 'bracket' }> = [];

    // Find all [[bracket]] patterns
    let bracketMatch;
    while ((bracketMatch = bracketPattern.exec(content)) !== null) {
      allMatches.push({
        start: bracketMatch.index,
        end: bracketMatch.index + bracketMatch[0].length,
        text: bracketMatch[1],
        type: 'bracket'
      });
    }

    // Sort matches by position
    allMatches.sort((a, b) => a.start - b.start);

    // Process the content
    allMatches.forEach((match) => {
      // Add text before this match
      if (currentIndex < match.start) {
        const textBefore = content.slice(currentIndex, match.start);
        if (textBefore) {
          segments.push({ type: 'text', content: textBefore });
        }
      }

      // Process the bracket content
      const bracketText = match.text;
      const linkData = linkMap.get(bracketText.toLowerCase());

      if (linkData) {
        // This is an existing link
        segments.push({
          type: linkData.target_exists ? 'existing_link' : 'broken_link',
          content: bracketText,
          linkData
        });
      } else {
        // This is an unprocessed bracket
        segments.push({
          type: 'unprocessed_bracket',
          content: `[[${bracketText}]]`
        });
      }

      currentIndex = match.end;
    });

    // Add remaining text
    if (currentIndex < content.length) {
      segments.push({ type: 'text', content: content.slice(currentIndex) });
    }

    return segments;
  }, [content, linkData]);

  const handleLinkClick = (linkData: LinkData) => {
    if (linkData.target_exists && linkData.canonical_slug) {
      navigateToNote(linkData.canonical_slug, linkData.target_note_id);
    }
  };

  const renderSegment = (segment: ProcessedSegment, index: number) => {
    switch (segment.type) {
      case 'existing_link':
        if (!segment.linkData) return segment.content;
        return (
          <TooltipProvider key={index}>
            <NotePreviewTooltip noteId={segment.linkData.target_note_id}>
              <span
                className="text-blue-600 underline underline-offset-4 cursor-pointer hover:text-blue-700 transition-colors"
                onClick={() => handleLinkClick(segment.linkData!)}
              >
                {segment.content}
              </span>
            </NotePreviewTooltip>
          </TooltipProvider>
        );

      case 'broken_link':
        return (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-red-500 line-through cursor-not-allowed">
                  {segment.content}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  <span>This note no longer exists</span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );

      case 'unprocessed_bracket':
        return (
          <span 
            key={index} 
            className="text-amber-600 underline decoration-dashed underline-offset-4"
          >
            {segment.content}
          </span>
        );

      default:
        return <span key={index}>{segment.content}</span>;
    }
  };

  return (
    <div className={className}>
      {processedSegments.map((segment, index) => renderSegment(segment, index))}
    </div>
  );
};

export default LinkifiedContent;
import { SearchQuery, SearchFilters } from '@/hooks/useEnhancedSearch';

export interface ProcessedQuery {
  originalQuery: string;
  processedQuery: string;
  intent: 'search' | 'create' | 'navigate' | 'find_similar';
  entities: string[];
  temporal: TemporalFilter | null;
  semantic: boolean;
  filters: SearchFilters;
}

interface TemporalFilter {
  type: 'relative' | 'absolute';
  start?: Date;
  end?: Date;
  description: string;
}

export class QueryProcessor {
  private static temporalPatterns = [
    { pattern: /last\s+week/i, days: 7, type: 'relative' },
    { pattern: /this\s+week/i, days: 7, type: 'current_week' },
    { pattern: /last\s+month/i, days: 30, type: 'relative' },
    { pattern: /this\s+month/i, type: 'current_month' },
    { pattern: /yesterday/i, days: 1, type: 'relative' },
    { pattern: /today/i, days: 0, type: 'current_day' },
    { pattern: /recent/i, days: 7, type: 'relative' },
    { pattern: /(\d+)\s+days?\s+ago/i, type: 'relative_dynamic' }
  ];

  private static entityPatterns = [
    { pattern: /(?:about|regarding|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g, type: 'person' },
    { pattern: /(?:project|task)\s+([a-zA-Z0-9\s]+)/gi, type: 'project' },
    { pattern: /#([a-zA-Z0-9_-]+)/g, type: 'tag' }
  ];

  private static intentPatterns = [
    { pattern: /^(?:create|new|add)\s+/i, intent: 'create' },
    { pattern: /^(?:find|search|look\s+for)\s+similar\s+to/i, intent: 'find_similar' },
    { pattern: /^(?:go\s+to|open|navigate\s+to)\s+/i, intent: 'navigate' },
    { pattern: /^(?:find|search|show|list)\s+/i, intent: 'search' }
  ];

  static processQuery(query: string): ProcessedQuery {
    const result: ProcessedQuery = {
      originalQuery: query,
      processedQuery: query,
      intent: 'search',
      entities: [],
      temporal: null,
      semantic: false,
      filters: { tags: [], excludeTags: [] }
    };

    // Detect intent
    result.intent = this.detectIntent(query);

    // Extract temporal information
    result.temporal = this.extractTemporal(query);
    if (result.temporal) {
      result.processedQuery = this.removeTemporal(query);
    }

    // Extract entities
    result.entities = this.extractEntities(query);

    // Determine if semantic search should be used
    result.semantic = this.shouldUseSemanticSearch(query, result.intent);

    // Extract filters
    result.filters = this.extractFilters(query);

    // Clean processed query
    result.processedQuery = this.cleanQuery(result.processedQuery);

    return result;
  }

  private static detectIntent(query: string): ProcessedQuery['intent'] {
    for (const pattern of this.intentPatterns) {
      if (pattern.pattern.test(query)) {
        return pattern.intent as ProcessedQuery['intent'];
      }
    }
    return 'search';
  }

  private static extractTemporal(query: string): TemporalFilter | null {
    for (const pattern of this.temporalPatterns) {
      const match = query.match(pattern.pattern);
      if (match) {
        const now = new Date();
        let start: Date | undefined;
        let end: Date | undefined;

        switch (pattern.type) {
          case 'relative':
            start = new Date(now.getTime() - (pattern.days! * 24 * 60 * 60 * 1000));
            end = now;
            break;

          case 'current_week':
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            start = startOfWeek;
            end = now;
            break;

          case 'current_month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = now;
            break;

          case 'current_day':
            start = new Date(now);
            start.setHours(0, 0, 0, 0);
            end = now;
            break;

          case 'relative_dynamic':
            const days = parseInt(match[1], 10);
            if (!isNaN(days)) {
              start = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
              end = now;
            }
            break;
        }

        if (start && end) {
          return {
            type: pattern.type === 'relative_dynamic' ? 'relative' : 'relative',
            start,
            end,
            description: match[0]
          };
        }
      }
    }
    return null;
  }

  private static extractEntities(query: string): string[] {
    const entities: string[] = [];

    for (const entityPattern of this.entityPatterns) {
      let match;
      while ((match = entityPattern.pattern.exec(query)) !== null) {
        if (match[1]) {
          entities.push(match[1].trim());
        }
      }
    }

    return [...new Set(entities)]; // Remove duplicates
  }

  private static shouldUseSemanticSearch(query: string, intent: string): boolean {
    // Use semantic search for concept-based queries
    const semanticIndicators = [
      'similar', 'related', 'like', 'about', 'regarding',
      'concept', 'idea', 'topic', 'theme', 'meaning'
    ];

    const lowerQuery = query.toLowerCase();
    return semanticIndicators.some(indicator => lowerQuery.includes(indicator)) ||
           intent === 'find_similar' ||
           query.length > 20; // Longer queries benefit from semantic search
  }

  private static extractFilters(query: string): SearchFilters {
    const filters: SearchFilters = { tags: [], excludeTags: [] };

    // Extract tags
    const tagMatches = query.match(/#([a-zA-Z0-9_-]+)/g);
    if (tagMatches) {
      filters.tags = tagMatches.map(tag => tag.slice(1));
    }

    // Extract exclude tags
    const excludeMatches = query.match(/-#([a-zA-Z0-9_-]+)/g);
    if (excludeMatches) {
      filters.excludeTags = excludeMatches.map(tag => tag.slice(2));
    }

    // Extract category hints
    const categoryHints = [
      { keywords: ['work', 'business', 'office', 'meeting'], category: 'work' },
      { keywords: ['personal', 'private', 'diary', 'journal'], category: 'personal' },
      { keywords: ['research', 'study', 'analysis', 'investigation'], category: 'research' }
    ];

    const lowerQuery = query.toLowerCase();
    for (const hint of categoryHints) {
      if (hint.keywords.some(keyword => lowerQuery.includes(keyword))) {
        filters.category = hint.category as any;
        break;
      }
    }

    return filters;
  }

  private static removeTemporal(query: string): string {
    let cleanQuery = query;
    for (const pattern of this.temporalPatterns) {
      cleanQuery = cleanQuery.replace(pattern.pattern, '');
    }
    return cleanQuery.trim();
  }

  private static cleanQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/^(?:find|search|show|list)\s+/i, '') // Remove intent prefixes
      .replace(/-?#[a-zA-Z0-9_-]+/g, '') // Remove tag filters
      .trim();
  }

  static expandQuery(query: string): string[] {
    const expansions: string[] = [query];

    // Synonym expansion
    const synonyms: Record<string, string[]> = {
      'meeting': ['discussion', 'call', 'conference'],
      'project': ['task', 'work', 'assignment'],
      'note': ['memo', 'document', 'entry'],
      'idea': ['concept', 'thought', 'brainstorm'],
      'plan': ['strategy', 'roadmap', 'blueprint']
    };

    const words = query.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (synonyms[word]) {
        synonyms[word].forEach(synonym => {
          const expandedQuery = query.replace(new RegExp(`\\b${word}\\b`, 'gi'), synonym);
          if (expandedQuery !== query) {
            expansions.push(expandedQuery);
          }
        });
      }
    }

    return expansions;
  }
}
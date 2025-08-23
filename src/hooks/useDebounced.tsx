import { useState, useEffect, useMemo } from 'react';

// Simple debounce implementation
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T => {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
};

export const useDebounced = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  return useMemo(
    () => debounce(callback, delay) as T,
    [callback, delay]
  );
};

export const useDebouncedSearch = (
  searchFunction: (query: string) => void,
  delay: number = 300
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounced(searchQuery, delay);

  useEffect(() => {
    if (debouncedQuery) {
      searchFunction(debouncedQuery);
    }
  }, [debouncedQuery, searchFunction]);

  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
  };
};
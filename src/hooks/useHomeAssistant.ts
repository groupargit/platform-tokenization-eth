import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  getYaleLockState,
  unlockYaleLock,
  lockYaleLock,
  HomeAssistantState,
  HomeAssistantError,
} from '@/services/homeAssistantService';

export interface UseHomeAssistantOptions {
  entityId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseHomeAssistantReturn {
  state: HomeAssistantState | null;
  isLoading: boolean;
  isLocked: boolean;
  error: Error | null;
  isConnected: boolean;
  optimisticLocked: boolean | null;
  unlock: () => Promise<boolean>;
  lock: () => Promise<boolean>;
  refresh: () => Promise<void>;
  clearOptimistic: () => void;
}

export function useHomeAssistant(
  options: UseHomeAssistantOptions = {}
): UseHomeAssistantReturn {
  const {
    entityId,
    autoRefresh = true,
    refreshInterval = 5000,
  } = options;
  
  const [state, setState] = useState<HomeAssistantState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const [optimisticLocked, setOptimisticLocked] = useState<boolean | null>(null);
  
  const entityIdRef = useRef(entityId);
  const isMountedRef = useRef(true);
  const lastRefreshRef = useRef(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const actionInProgressRef = useRef(false);
  
  useEffect(() => { entityIdRef.current = entityId; }, [entityId]);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { 
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (optimisticLocked !== null && state) {
      const serverLocked = state.state === 'locked' || state.state === 'LOCKED';
      if (serverLocked === optimisticLocked) {
        setOptimisticLocked(null);
      }
    }
  }, [state, optimisticLocked]);

  const refresh = useCallback(async () => {
    const currentEntityId = entityIdRef.current;
    if (!currentEntityId) return;
    
    const now = Date.now();
    if (now - lastRefreshRef.current < 300) return;
    lastRefreshRef.current = now;
    
    try {
      const lockState = await getYaleLockState(currentEntityId);
      if (isMountedRef.current) {
        setState(lockState);
        setIsConnected(true);
        setError(null);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      const error = err instanceof Error ? err : new Error('Error');
      setError(error);
      if (err instanceof Error && (
        err.message.includes('CORS') ||
        err.message.includes('network') ||
        err.message.includes('Failed to fetch')
      )) {
        setIsConnected(false);
      }
    }
  }, []);

  const refreshAfterAction = useCallback(() => {
    const delays = [200, 600, 1200];
    delays.forEach(delay => {
      const timeout = setTimeout(() => {
        if (isMountedRef.current && !actionInProgressRef.current) {
          refresh();
        }
      }, delay);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = timeout;
    });
  }, [refresh]);

  const clearOptimistic = useCallback(() => {
    setOptimisticLocked(null);
  }, []);

  const unlock = useCallback(async (): Promise<boolean> => {
    const currentEntityId = entityIdRef.current;
    if (!currentEntityId) throw new Error('Entity ID no configurado');
    
    setError(null);
    setIsLoading(true);
    actionInProgressRef.current = true;
    
    setOptimisticLocked(false);
    
    try {
      await unlockYaleLock(currentEntityId);
      
      if (isMountedRef.current) {
        setIsLoading(false);
        actionInProgressRef.current = false;
        refreshAfterAction();
      }
      return true;
    } catch (err) {
      // Rollback optimistic update on error
      if (isMountedRef.current) {
        setOptimisticLocked(null);
        const error = err instanceof HomeAssistantError ? err : new Error('Error al desbloquear');
        setError(error);
        setIsLoading(false);
        actionInProgressRef.current = false;
      }
      throw err;
    }
  }, [refreshAfterAction]);

  const lock = useCallback(async (): Promise<boolean> => {
    const currentEntityId = entityIdRef.current;
    if (!currentEntityId) throw new Error('Entity ID no configurado');
    
    setError(null);
    setIsLoading(true);
    actionInProgressRef.current = true;
    
    setOptimisticLocked(true);
    
    try {
      await lockYaleLock(currentEntityId);
      
      if (isMountedRef.current) {
        setIsLoading(false);
        actionInProgressRef.current = false;
        refreshAfterAction();
      }
      return true;
    } catch (err) {
      // Rollback optimistic update on error
      if (isMountedRef.current) {
        setOptimisticLocked(null);
        const error = err instanceof HomeAssistantError ? err : new Error('Error al bloquear');
        setError(error);
        setIsLoading(false);
        actionInProgressRef.current = false;
      }
      throw err;
    }
  }, [refreshAfterAction]);

  useEffect(() => {
    if (!entityId || !autoRefresh) {
      setIsConnected(false);
      return;
    }
    refresh();
  }, [entityId, autoRefresh, refresh]);

  useEffect(() => {
    if (!autoRefresh || !entityId) return;
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(() => {
      if (!actionInProgressRef.current) {
        refresh();
      }
    }, refreshInterval);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, entityId, refresh]);

  const isLocked = useMemo(() => {
    if (optimisticLocked !== null) return optimisticLocked;
    return state?.state === 'locked' || state?.state === 'LOCKED';
  }, [optimisticLocked, state?.state]);

  if (!entityId) {
    return {
      state: null,
      isLoading: false,
      isLocked: false,
      error: null,
      isConnected: false,
      optimisticLocked: null,
      unlock: async () => { throw new Error('Entity ID no configurado'); },
      lock: async () => { throw new Error('Entity ID no configurado'); },
      refresh: async () => {},
      clearOptimistic: () => {},
    };
  }

  return { 
    state, 
    isLoading, 
    isLocked, 
    error, 
    isConnected, 
    optimisticLocked,
    unlock, 
    lock, 
    refresh,
    clearOptimistic,
  };
}

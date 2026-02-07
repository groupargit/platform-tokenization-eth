import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  getEntityState,
  turnOnSwitch,
  turnOffSwitch,
  toggleSwitch,
  openCover,
  closeCover,
  toggleCover,
  lockYaleLock,
  unlockYaleLock,
  HomeAssistantState,
  HomeAssistantError,
} from '@/services/homeAssistantService';
import { IoTDevice } from '@/hooks/useFirebaseDevices';

// Tipos de dominio soportados
export type DeviceDomain = 'switch' | 'cover' | 'lock' | 'motor' | 'light' | 'sensor' | 'binary_sensor';

export interface UseDeviceControlOptions {
  device: IoTDevice;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseDeviceControlReturn {
  // Estado
  state: HomeAssistantState | null;
  isLoading: boolean;
  isOn: boolean;
  isOpen: boolean;
  isLocked: boolean;
  error: Error | null;
  isConnected: boolean;
  optimisticState: string | null;
  
  // Acciones genéricas
  toggle: () => Promise<boolean>;
  turnOn: () => Promise<boolean>;
  turnOff: () => Promise<boolean>;
  open: () => Promise<boolean>;
  close: () => Promise<boolean>;
  lock: () => Promise<boolean>;
  unlock: () => Promise<boolean>;
  refresh: () => Promise<void>;
  
  // Info
  domain: DeviceDomain | null;
  entityId: string | null;
  isControllable: boolean;
}

/**
 * Hook genérico para controlar dispositivos IoT vía Home Assistant
 * Soporta switches, covers, locks y más
 */
export function useDeviceControl(options: UseDeviceControlOptions): UseDeviceControlReturn {
  const { device, autoRefresh = true, refreshInterval = 5000 } = options;
  
  const [state, setState] = useState<HomeAssistantState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [optimisticState, setOptimisticState] = useState<string | null>(null);
  
  const isMountedRef = useRef(true);
  const lastRefreshRef = useRef(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const actionInProgressRef = useRef(false);
  
  // Extraer entityId y domain de la integración de Home Assistant
  const entityId = useMemo(() => {
    return device.integration?.homeAssistant?.entityId || null;
  }, [device]);
  
  const domain = useMemo((): DeviceDomain | null => {
    const haDomain = device.integration?.homeAssistant?.domain;
    if (haDomain === 'switch' || haDomain === 'cover' || haDomain === 'lock' || 
        haDomain === 'light' || haDomain === 'motor' || haDomain === 'sensor' || 
        haDomain === 'binary_sensor') {
      return haDomain as DeviceDomain;
    }
    
    // Fallback basado en capabilities
    if (device.capabilities?.includes('switch')) return 'switch';
    if (device.capabilities?.includes('motor')) return 'cover';
    if (device.capabilities?.includes('lock')) return 'lock';
    
    return null;
  }, [device]);
  
  // Determinar si el dispositivo es controlable
  const isControllable = useMemo(() => {
    if (!entityId || !domain) return false;
    return ['switch', 'cover', 'lock', 'light', 'motor'].includes(domain);
  }, [entityId, domain]);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);
  
  // Clear optimistic state when server confirms
  useEffect(() => {
    if (optimisticState !== null && state) {
      const serverState = state.state?.toLowerCase();
      if (serverState === optimisticState.toLowerCase()) {
        setOptimisticState(null);
      }
    }
  }, [state, optimisticState]);
  
  // Track 404 errors to avoid repeated polling
  const entity404Ref = useRef(false);
  
  const refresh = useCallback(async () => {
    if (!entityId) return;
    
    // Skip polling if we got a 404 (entity doesn't exist in HA)
    if (entity404Ref.current) return;
    
    // Throttle: minimum 300ms between refreshes
    const now = Date.now();
    if (now - lastRefreshRef.current < 300) return;
    lastRefreshRef.current = now;
    
    try {
      const entityState = await getEntityState(entityId);
      if (isMountedRef.current) {
        setState(entityState);
        setIsConnected(true);
        setError(null);
        entity404Ref.current = false;
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      const error = err instanceof Error ? err : new Error('Error');
      
      // Check for 404 - entity not found in Home Assistant
      if (err instanceof HomeAssistantError && err.statusCode === 404) {
        entity404Ref.current = true;
        setIsConnected(false);
        // Don't set error for 404 - just mark as not connected
        // This avoids spamming console with errors for entities that don't exist
        console.debug(`[useDeviceControl] Entity ${entityId} not found in Home Assistant (404)`);
        return;
      }
      
      setError(error);
      if (err instanceof Error && (
        err.message.includes('CORS') ||
        err.message.includes('network') ||
        err.message.includes('Failed to fetch')
      )) {
        setIsConnected(false);
      }
    }
  }, [entityId]);
  
  // Aggressive refresh after action
  const refreshAfterAction = useCallback(() => {
    const delays = [200, 600, 1200];
    delays.forEach(delay => {
      setTimeout(() => {
        if (isMountedRef.current && !actionInProgressRef.current) {
          refresh();
        }
      }, delay);
    });
  }, [refresh]);
  
  // ============================================================================
  // ACCIONES
  // ============================================================================
  
  const executeAction = useCallback(async (
    action: () => Promise<void>,
    optimisticValue: string
  ): Promise<boolean> => {
    if (!entityId) throw new Error('Entity ID no configurado');
    
    setError(null);
    setIsLoading(true);
    actionInProgressRef.current = true;
    setOptimisticState(optimisticValue);
    
    try {
      await action();
      
      if (isMountedRef.current) {
        setIsLoading(false);
        actionInProgressRef.current = false;
        refreshAfterAction();
      }
      return true;
    } catch (err) {
      if (isMountedRef.current) {
        setOptimisticState(null);
        const error = err instanceof HomeAssistantError ? err : new Error('Error al ejecutar acción');
        setError(error);
        setIsLoading(false);
        actionInProgressRef.current = false;
      }
      throw err;
    }
  }, [entityId, refreshAfterAction]);
  
  // Switch actions
  const turnOn = useCallback(async (): Promise<boolean> => {
    if (!entityId) throw new Error('Entity ID no configurado');
    return executeAction(() => turnOnSwitch(entityId), 'on');
  }, [entityId, executeAction]);
  
  const turnOff = useCallback(async (): Promise<boolean> => {
    if (!entityId) throw new Error('Entity ID no configurado');
    return executeAction(() => turnOffSwitch(entityId), 'off');
  }, [entityId, executeAction]);
  
  // Cover actions
  const open = useCallback(async (): Promise<boolean> => {
    if (!entityId) throw new Error('Entity ID no configurado');
    return executeAction(() => openCover(entityId), 'open');
  }, [entityId, executeAction]);
  
  const close = useCallback(async (): Promise<boolean> => {
    if (!entityId) throw new Error('Entity ID no configurado');
    return executeAction(() => closeCover(entityId), 'closed');
  }, [entityId, executeAction]);
  
  // Lock actions
  const lock = useCallback(async (): Promise<boolean> => {
    if (!entityId) throw new Error('Entity ID no configurado');
    return executeAction(() => lockYaleLock(entityId), 'locked');
  }, [entityId, executeAction]);
  
  const unlock = useCallback(async (): Promise<boolean> => {
    if (!entityId) throw new Error('Entity ID no configurado');
    return executeAction(() => unlockYaleLock(entityId), 'unlocked');
  }, [entityId, executeAction]);
  
  // Toggle genérico según dominio
  const toggle = useCallback(async (): Promise<boolean> => {
    if (!entityId || !domain) throw new Error('Entity ID o dominio no configurado');
    
    switch (domain) {
      case 'switch':
      case 'light':
        return executeAction(() => toggleSwitch(entityId), 
          (optimisticState === 'on' || state?.state === 'on') ? 'off' : 'on');
      
      case 'cover':
      case 'motor':
        return executeAction(() => toggleCover(entityId),
          (optimisticState === 'open' || state?.state === 'open') ? 'closed' : 'open');
      
      case 'lock':
        const isCurrentlyLocked = optimisticState === 'locked' || state?.state === 'locked';
        if (isCurrentlyLocked) {
          return unlock();
        } else {
          return lock();
        }
      
      default:
        throw new Error(`Dominio ${domain} no soporta toggle`);
    }
  }, [entityId, domain, optimisticState, state, executeAction, lock, unlock]);
  
  // Initial connection
  useEffect(() => {
    if (!entityId || !autoRefresh) {
      setIsConnected(false);
      return;
    }
    refresh();
  }, [entityId, autoRefresh, refresh]);
  
  // Polling
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
  
  // Computed states
  const currentState = optimisticState || state?.state?.toLowerCase() || '';
  const isOn = currentState === 'on';
  const isOpen = currentState === 'open';
  const isLocked = currentState === 'locked';
  
  if (!entityId) {
    return {
      state: null,
      isLoading: false,
      isOn: false,
      isOpen: false,
      isLocked: false,
      error: null,
      isConnected: false,
      optimisticState: null,
      toggle: async () => { throw new Error('Entity ID no configurado'); },
      turnOn: async () => { throw new Error('Entity ID no configurado'); },
      turnOff: async () => { throw new Error('Entity ID no configurado'); },
      open: async () => { throw new Error('Entity ID no configurado'); },
      close: async () => { throw new Error('Entity ID no configurado'); },
      lock: async () => { throw new Error('Entity ID no configurado'); },
      unlock: async () => { throw new Error('Entity ID no configurado'); },
      refresh: async () => {},
      domain: null,
      entityId: null,
      isControllable: false,
    };
  }
  
  return {
    state,
    isLoading,
    isOn,
    isOpen,
    isLocked,
    error,
    isConnected,
    optimisticState,
    toggle,
    turnOn,
    turnOff,
    open,
    close,
    lock,
    unlock,
    refresh,
    domain,
    entityId,
    isControllable,
  };
}

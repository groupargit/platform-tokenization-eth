import { useState, useEffect, useMemo } from 'react';
import { ref, get, onValue } from 'firebase/database';
import { database, isFirebaseConfigured } from '@/lib/firebase';

export interface DeviceAccessControl {
  automationAccess: boolean;
  guestAccess: boolean;
  manualOverride: boolean;
  ownerAccess: boolean;
  scheduleAccess: boolean;
  tenantAccess: boolean;
}

export interface DeviceLocation {
  apartmentId: string;
  buildingId: string;
  floor: number;
  room: string;
  zone: string;
  isCommonArea?: boolean;
  roomType?: string;
}

export interface DeviceBattery {
  batteryLevel: number;
  lowBatteryAlert: boolean;
  lastBatteryUpdate: string;
  batteryLowThreshold?: number;
}

export interface DeviceLastKnownState {
  lock?: {
    lockState: string;
    status: string;
    lastOperation: string;
    method?: string;
  };
  battery?: {
    level: number;
    status: string;
  };
  state?: string;
  timestamp: string;
}

export interface IoTDevice {
  deviceId: string;
  name: string;
  model: string;
  manufacturer: string;
  status: 'online' | 'offline';
  healthStatus: 'healthy' | 'warning' | 'error';
  protocol: string;
  capabilities: string[];
  accessControl: DeviceAccessControl;
  location?: DeviceLocation;
  apartmentContext?: {
    apartmentId: string;
    buildingId: string;
    floor: number;
    room: string;
    roomType?: string;
    zone: string;
    isCommonArea?: boolean;
  };
  battery?: DeviceBattery;
  lastKnownState: DeviceLastKnownState;
  lastSeen: string;
  payloads?: Record<string, any>;
  supportedFeatures?: Record<string, boolean>;
  integration?: {
    homeAssistant?: {
      entityId: string;
      domain: string;
      deviceClass?: string;
      integrationType?: string;
    };
    zigbee2mqtt?: any;
    mqtt?: any;
  };
}

export type DeviceCategory = 'lock' | 'motor' | 'sensor' | 'light' | 'climate' | 'security' | 'other';

export interface CategorizedDevice extends IoTDevice {
  category: DeviceCategory;
  displayName: string;
  icon: string;
  primaryAction?: {
    label: string;
    action: 'lock' | 'unlock' | 'open' | 'close' | 'toggle' | 'read';
  };
  secondaryAction?: {
    label: string;
    action: string;
  };
}

function categorizeDevice(device: IoTDevice): CategorizedDevice {
  const capabilities = device.capabilities || [];
  const model = device.model?.toLowerCase() || '';
  const name = device.name?.toLowerCase() || '';
  
  let category: DeviceCategory = 'other';
  let icon = '📱';
  let displayName = device.name;
  let primaryAction: CategorizedDevice['primaryAction'];
  let secondaryAction: CategorizedDevice['secondaryAction'];

  if (capabilities.includes('lock') || model.includes('yrd') || name.includes('lock') || name.includes('cerrojo')) {
    category = 'lock';
    icon = '🔐';
    displayName = device.name || 'Cerradura';
    
    const isLocked = device.lastKnownState?.lock?.status === 'locked' || 
                     device.lastKnownState?.lock?.lockState === 'locked' ||
                     device.lastKnownState?.lock?.lockState === 'LOCKED';
    
    primaryAction = {
      label: isLocked ? 'Desbloquear' : 'Bloquear',
      action: isLocked ? 'unlock' : 'lock'
    };
    secondaryAction = { label: 'Ver historial', action: 'history' };
  }
  else if (capabilities.includes('motor') || name.includes('motor') || name.includes('parking')) {
    category = 'motor';
    icon = '🚗';
    displayName = 'Puerta Parqueadero';
    
    const isOpen = device.lastKnownState?.state === 'OPEN';
    primaryAction = {
      label: isOpen ? 'Cerrar' : 'Abrir',
      action: isOpen ? 'close' : 'open'
    };
  }
  else if (capabilities.includes('motion_detection') || capabilities.includes('temperature') || 
           capabilities.some(c => c.includes('sensor')) || name.includes('pir')) {
    category = 'sensor';
    icon = '📡';
    displayName = device.name.replace(/ESP32|B001|apt_\d+|-/g, '').trim() || 'Sensor';
    primaryAction = { label: 'Actualizar', action: 'read' };
  }
  else if (capabilities.includes('brightness') || capabilities.includes('dimming') || 
           name.includes('light') || name.includes('luz')) {
    category = 'light';
    icon = '💡';
    displayName = 'Luz';
    primaryAction = { label: 'Toggle', action: 'toggle' };
  }
  else if (capabilities.includes('ble_scanning') || capabilities.includes('proximity_detection')) {
    category = 'security';
    icon = '📶';
    displayName = 'Detector de Proximidad';
    primaryAction = { label: 'Escanear', action: 'read' };
  }

  return {
    ...device,
    category,
    displayName,
    icon,
    primaryAction,
    secondaryAction,
  };
}

function filterDevicesByAccess(
  devices: IoTDevice[], 
  userRole: 'owner' | 'resident' | 'guest' | 'admin',
  userApartmentIds: string[]
): IoTDevice[] {
  return devices.filter(device => {
    const access = device.accessControl;
    const location = device.location || device.apartmentContext;

    if (userRole === 'owner' && access.ownerAccess) {
      return true;
    }
    
    if (userRole === 'resident' && access.tenantAccess) {
      const zone = location?.zone || (location?.isCommonArea ? 'common' : 'private');
      const aptId = location?.apartmentId;
      
      if (zone === 'common' || (aptId && userApartmentIds.includes(aptId))) {
        return true;
      }
    }
    
    if (userRole === 'guest' && access.guestAccess) {
      return true;
    }

    if (userRole === 'admin') {
      return true;
    }

    return false;
  });
}

export interface UseFirebaseDevicesOptions {
  buildingId?: string;
  apartmentId?: string | null;
  onlyOnline?: boolean;
  includeCommonAreas?: boolean;
}

export function useFirebaseDevices(buildingId: string = 'B001') {
  return useFirebaseDevicesFiltered({ buildingId });
}

export function useFirebaseDevicesFiltered(options: UseFirebaseDevicesOptions = {}) {
  const { 
    buildingId = 'B001', 
    apartmentId = null, 
    onlyOnline = false,
    includeCommonAreas = true 
  } = options;
  
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !database) {
      setLoading(false);
      return;
    }

    const devicesRef = ref(database, 'iot_devices');
    
    const unsubscribe = onValue(
      devicesRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const deviceList: IoTDevice[] = Object.entries(data)
            .map(([key, value]: [string, any]) => {
              const deviceData = {
                deviceId: value.deviceId || key,
                ...value,
              };
              return deviceData;
            })
            .filter(device => {
              const ctx = device.apartmentContext;
              const loc = device.location;
              
              const buildingMatch = 
                ctx?.buildingId === buildingId ||
                loc?.buildingId === buildingId;
              if (!buildingMatch) return false;
              
              if (apartmentId) {
                const deviceAptId = ctx?.apartmentId || loc?.apartmentId;
                const isCommonArea = ctx?.isCommonArea === true || ctx?.zone === 'common';
                
                const apartmentMatch = deviceAptId === apartmentId;
                const commonAreaMatch = includeCommonAreas && isCommonArea;
                
                if (!apartmentMatch && !commonAreaMatch) return false;
              }
              
              if (onlyOnline && device.status !== 'online') {
                return false;
              }
              
              return true;
            });
          
          setDevices(deviceList);
        } else {
          setDevices([]);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching devices from Firebase:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [buildingId, apartmentId, onlyOnline, includeCommonAreas]);

  const stats = useMemo(() => ({
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
  }), [devices]);

  return {
    devices,
    stats,
    loading,
    error,
    isConfigured: isFirebaseConfigured,
  };
}

export function useUserDevices(
  buildingId: string = 'B001',
  userRole: 'owner' | 'resident' | 'guest' | 'admin' = 'resident',
  userApartmentIds: string[] = []
) {
  const { devices, loading, error, isConfigured } = useFirebaseDevices(buildingId);

  const accessibleDevices = useMemo(() => {
    if (!devices.length) return [];
    return filterDevicesByAccess(devices, userRole, userApartmentIds);
  }, [devices, userRole, userApartmentIds]);

  const categorizedDevices = useMemo(() => {
    return accessibleDevices.map(categorizeDevice);
  }, [accessibleDevices]);

  const devicesByCategory = useMemo(() => {
    const grouped: Record<DeviceCategory, CategorizedDevice[]> = {
      lock: [],
      motor: [],
      sensor: [],
      light: [],
      climate: [],
      security: [],
      other: [],
    };

    categorizedDevices.forEach(device => {
      grouped[device.category].push(device);
    });

    return grouped;
  }, [categorizedDevices]);

  const quickAccessDevices = useMemo(() => {
    return categorizedDevices.filter(
      device => 
        (device.category === 'lock' || device.category === 'motor') &&
        device.location.zone === 'common' &&
        device.status === 'online'
    );
  }, [categorizedDevices]);

  return {
    devices: categorizedDevices,
    devicesByCategory,
    quickAccessDevices,
    loading,
    error,
    isConfigured,
    stats: {
      total: categorizedDevices.length,
      online: categorizedDevices.filter(d => d.status === 'online').length,
      locks: devicesByCategory.lock.length,
      sensors: devicesByCategory.sensor.length,
    },
  };
}

export function useEntranceDevices(buildingId: string = 'B001') {
  const { devices, loading, error, isConfigured } = useFirebaseDevices(buildingId);

  const entranceDevices = useMemo(() => {
    return devices
      .filter(device => {
        const location = device.location || device.apartmentContext;
        return (
          location?.room === 'entrance' || 
          location?.roomType === 'entrance' ||
          location?.zone === 'common' ||
          location?.isCommonArea === true
        );
      })
      .map(categorizeDevice)
      .filter(device => 
        device.category === 'lock' || 
        device.category === 'motor' ||
        device.category === 'security'
      );
  }, [devices]);

  const mainLock = useMemo(() => {
    return entranceDevices.find(d => {
      const location = d.location || (d as any).apartmentContext;
      return (
        d.category === 'lock' && 
        (location?.room === 'entrance' || location?.roomType === 'entrance')
      );
    }) || null;
  }, [entranceDevices]);

  const mainGate = useMemo(() => {
    return entranceDevices.find(d => {
      const location = d.location || (d as any).apartmentContext;
      return (
        d.category === 'motor' && 
        (location?.room === 'entrance' || location?.roomType === 'entrance')
      );
    }) || null;
  }, [entranceDevices]);

  return {
    entranceDevices,
    mainLock,
    mainGate,
    loading,
    error,
    isConfigured,
  };
}

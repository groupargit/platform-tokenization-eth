import { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { database, isFirebaseConfigured } from '@/lib/firebase';

// ============================================================================
// Hook para obtener dispositivos IoT del apartamento del usuario
// Basado en la estructura: buildings/B001/zones/{apartmentId}/iotDevices
// ============================================================================

export interface ApartmentIoTDevice {
  deviceId: string;
  name: string;
  type: 'sensor' | 'actuator';
  status: 'active' | 'inactive';
  digital: boolean;
  lastValidation: string;
  parameters: {
    location?: string;
    model?: string;
    lightIntensity?: number;
    [key: string]: any;
  };
  pins: {
    pin1: string;
    pin2: string;
  };
}

export interface ESP32Device {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  ipAddress: string;
  status: 'online' | 'offline';
  location: string;
  lastSeen: string;
  lastHeartbeat?: number;
  wifiSignal?: number;
  freeHeap?: number;
  uptime?: number;
  zoneId?: string;
  apartmentId?: string;
}

export interface ApartmentZone {
  zoneName: string;
  zoneType: 'private' | 'commercial' | 'public';
  color: string;
  colorCode: string;
  colorMeaning?: string;
  concept?: string;
  accessLevel: string;
  authorizedUsers: string[];
  state: string;
  iotDevices: Record<string, ApartmentIoTDevice>;
  esp32Devices: Record<string, ESP32Device>;
  security?: {
    securityMode: { status: string; lastChecked: string };
    smartLock: { status: string; lastChecked: string; lockHistory?: any[] };
  };
  routines?: string[];
  images?: string[];
}

export type DeviceCategory = 'lighting' | 'security' | 'climate' | 'water' | 'sensors' | 'other';

export interface CategorizedApartmentDevice extends ApartmentIoTDevice {
  category: DeviceCategory;
  displayName: string;
  icon: string;
  description: string;
  canToggle: boolean;
}

function getDeviceCategory(device: ApartmentIoTDevice): DeviceCategory {
  const name = device.name.toLowerCase();
  const model = device.parameters?.model?.toLowerCase() || '';
  
  if (name.includes('light') || name.includes('luz') || model.includes('light')) {
    return 'lighting';
  }
  if (name.includes('door') || name.includes('lock') || name.includes('pir') || name.includes('security')) {
    return 'security';
  }
  if (name.includes('fan') || name.includes('temperature') || name.includes('clima')) {
    return 'climate';
  }
  if (name.includes('water') || name.includes('pump') || name.includes('rain')) {
    return 'water';
  }
  if (device.type === 'sensor') {
    return 'sensors';
  }
  return 'other';
}

function getDeviceDisplayInfo(device: ApartmentIoTDevice): { displayName: string; icon: string; description: string } {
  const name = device.name.toLowerCase();
  const location = device.parameters?.location || 'General';
  
  // Lighting
  if (name.includes('lightcontrol')) {
    return {
      displayName: `Iluminación ${location}`,
      icon: '💡',
      description: `Control de luz en ${location.toLowerCase()}`
    };
  }
  
  // Door/Security
  if (name.includes('doorsensor')) {
    return {
      displayName: `Sensor de puerta`,
      icon: '🚪',
      description: `Detecta apertura en ${location.toLowerCase()}`
    };
  }
  
  // PIR Motion
  if (name.includes('pir')) {
    return {
      displayName: `Detector de movimiento`,
      icon: '👁️',
      description: `Sensor de presencia en ${location.toLowerCase()}`
    };
  }
  
  // Fan
  if (name.includes('fan')) {
    return {
      displayName: `Ventilador`,
      icon: '🌀',
      description: `Control de ventilación en ${location.toLowerCase()}`
    };
  }
  
  // Temperature
  if (name.includes('temperature')) {
    return {
      displayName: `Sensor de temperatura`,
      icon: '🌡️',
      description: `Monitoreo térmico en ${location.toLowerCase()}`
    };
  }
  
  // Water pump
  if (name.includes('waterpump')) {
    return {
      displayName: `Bomba de agua`,
      icon: '💧',
      description: `Sistema de riego en ${location.toLowerCase()}`
    };
  }
  
  // Raindrop sensor
  if (name.includes('raindrop')) {
    return {
      displayName: `Sensor de lluvia`,
      icon: '🌧️',
      description: `Detector de precipitación en ${location.toLowerCase()}`
    };
  }
  
  // Curtain control
  if (name.includes('curtain')) {
    return {
      displayName: `Control de cortinas`,
      icon: '🪟',
      description: `Automatización de cortinas en ${location.toLowerCase()}`
    };
  }
  
  // Relay
  if (name.includes('relay')) {
    return {
      displayName: `Relé de control`,
      icon: '⚡',
      description: `Interruptor inteligente en ${location.toLowerCase()}`
    };
  }
  
  // Ultrasonic sensor
  if (name.includes('ultrasonic')) {
    return {
      displayName: `Sensor ultrasónico`,
      icon: '📡',
      description: `Detector de distancia en ${location.toLowerCase()}`
    };
  }
  
  // Default
  return {
    displayName: device.name.replace(/([A-Z])/g, ' $1').trim(),
    icon: device.type === 'actuator' ? '⚙️' : '📊',
    description: `Dispositivo en ${location.toLowerCase()}`
  };
}

function categorizeDevice(key: string, device: any): CategorizedApartmentDevice {
  const iotDevice: ApartmentIoTDevice = {
    deviceId: key,
    name: device.name || key,
    type: device.type || 'sensor',
    status: device.status || 'inactive',
    digital: device.digital ?? true,
    lastValidation: device.lastValidation || '',
    parameters: device.parameters || {},
    pins: device.pins || { pin1: '', pin2: '' }
  };
  
  const category = getDeviceCategory(iotDevice);
  const displayInfo = getDeviceDisplayInfo(iotDevice);
  
  return {
    ...iotDevice,
    category,
    displayName: displayInfo.displayName,
    icon: displayInfo.icon,
    description: displayInfo.description,
    canToggle: iotDevice.type === 'actuator'
  };
}

export function useApartmentDevices(
  buildingId: string = 'B001',
  apartmentId: string | null
) {
  const [zone, setZone] = useState<ApartmentZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !database || !apartmentId) {
      setLoading(false);
      return;
    }

    const zoneRef = ref(database, `buildings/${buildingId}/zones/${apartmentId}`);
    
    const unsubscribe = onValue(
      zoneRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setZone(snapshot.val());
        } else {
          setZone(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching apartment zone:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [buildingId, apartmentId]);

  const devices = useMemo(() => {
    if (!zone?.iotDevices) return [];
    return Object.entries(zone.iotDevices).map(([key, device]) => 
      categorizeDevice(key, device)
    );
  }, [zone]);

  const esp32Devices = useMemo(() => {
    if (!zone?.esp32Devices) return [];
    return Object.entries(zone.esp32Devices).map(([key, device]: [string, any]) => ({
      deviceId: device.deviceId || key,
      deviceName: device.deviceName || key,
      deviceType: device.deviceType || 'unknown',
      ipAddress: device.ipAddress || '',
      status: device.status || 'offline',
      location: device.location || '',
      lastSeen: device.lastSeen || '',
      lastHeartbeat: device.lastHeartbeat,
      wifiSignal: device.wifiSignal,
      freeHeap: device.freeHeap,
      uptime: device.uptime,
      zoneId: device.zoneId,
      apartmentId: device.apartmentId
    } as ESP32Device));
  }, [zone]);

  const devicesByCategory = useMemo(() => {
    const grouped: Record<DeviceCategory, CategorizedApartmentDevice[]> = {
      lighting: [],
      security: [],
      climate: [],
      water: [],
      sensors: [],
      other: []
    };
    
    devices.forEach(device => {
      grouped[device.category].push(device);
    });
    
    return grouped;
  }, [devices]);

  const stats = useMemo(() => ({
    total: devices.length,
    active: devices.filter(d => d.status === 'active').length,
    actuators: devices.filter(d => d.type === 'actuator').length,
    sensors: devices.filter(d => d.type === 'sensor').length,
    esp32Online: esp32Devices.filter(d => d.status === 'online').length,
    esp32Total: esp32Devices.length
  }), [devices, esp32Devices]);

  return {
    zone,
    devices,
    esp32Devices,
    devicesByCategory,
    stats,
    loading,
    error,
    isConfigured: isFirebaseConfigured
  };
}

// Hook para obtener zonas comunes
export function useCommonAreaDevices(buildingId: string = 'B001') {
  const [zone, setZone] = useState<ApartmentZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !database) {
      setLoading(false);
      return;
    }

    const zoneRef = ref(database, `buildings/${buildingId}/zones/common`);
    
    const unsubscribe = onValue(
      zoneRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setZone(snapshot.val());
        } else {
          setZone(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching common zone:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [buildingId]);

  const esp32Devices = useMemo(() => {
    if (!zone?.esp32Devices) return [];
    return Object.entries(zone.esp32Devices).map(([key, device]: [string, any]) => ({
      deviceId: device.deviceId || key,
      deviceName: device.deviceName || key,
      deviceType: device.deviceType || 'unknown',
      ipAddress: device.ipAddress || '',
      status: device.status || 'offline',
      location: device.location || '',
      lastSeen: device.lastSeen || '',
      lastHeartbeat: device.lastHeartbeat,
      wifiSignal: device.wifiSignal
    } as ESP32Device));
  }, [zone]);

  return {
    zone,
    esp32Devices,
    loading,
    error,
    isConfigured: isFirebaseConfigured
  };
}

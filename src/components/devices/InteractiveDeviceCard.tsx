import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Loader2, Power, PowerOff, Lock, Unlock, 
  ChevronUp, ChevronDown, Wifi, WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDeviceControl } from '@/hooks/useDeviceControl';
import { useToast } from '@/hooks/use-toast';
import { IoTDevice } from '@/hooks/useFirebaseDevices';
import { useApartmentColor } from '@/contexts/ApartmentColorContext';
import { useLanguage } from '@/i18n';

interface InteractiveDeviceCardProps {
  device: IoTDevice;
  className?: string;
}

/**
 * Tarjeta de dispositivo interactiva con control real vía Home Assistant
 * Soporta switches, covers/motors, y locks
 */
export function InteractiveDeviceCard({ device, className }: InteractiveDeviceCardProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isToggling, setIsToggling] = useState(false);
  const { primaryColor, secondaryColor } = useApartmentColor();
  
  const {
    isOn,
    isOpen,
    isLocked,
    isLoading,
    isConnected,
    isControllable,
    domain,
    entityId,
    toggle,
  } = useDeviceControl({ device, autoRefresh: true, refreshInterval: 10000 });
  
  // Si no hay entityId, el dispositivo no está configurado en Home Assistant
  const hasHomeAssistantEntity = !!entityId;
  
  // Determinar estado visual según dominio
  const getDeviceState = () => {
    switch (domain) {
      case 'switch':
      case 'light':
        return { active: isOn, label: isOn ? t.devices.onLabel : t.devices.offLabel };
      case 'cover':
      case 'motor':
        return { active: isOpen, label: isOpen ? t.devices.status.open : t.devices.status.closed };
      case 'lock':
        return { active: !isLocked, label: isLocked ? t.devices.locked : t.devices.unlocked };
      default:
        return { active: device.status === 'online', label: device.status === 'online' ? t.devices.status.active : t.devices.status.inactive };
    }
  };
  
  const { active, label } = getDeviceState();
  
  // Ícono según tipo
  const getIcon = () => {
    const name = device.name?.toLowerCase() || '';
    const caps = device.capabilities || [];
    
    if (caps.includes('lock') || name.includes('lock') || name.includes('cerrojo')) {
      return active ? '🔓' : '🔐';
    }
    if (caps.includes('motor') || domain === 'cover' || name.includes('motor')) {
      return active ? '🚗' : '🅿️';
    }
    if (caps.includes('switch') || domain === 'switch') {
      return active ? '💡' : '🔌';
    }
    if (caps.includes('temperature') || name.includes('temp')) return '🌡️';
    if (caps.includes('humidity') || name.includes('water')) return '💧';
    if (caps.some(c => c.includes('sensor')) || name.includes('pir')) return '📡';
    if (caps.includes('ble_scanning')) return '📶';
    
    return '📱';
  };
  
  // Nombre para mostrar
  const displayName = device.name || device.deviceId;
  const room = device.apartmentContext?.room || device.location?.room || '';
  const roomDisplay = room.charAt(0).toUpperCase() + room.slice(1);
  
  const handleToggle = async () => {
    if (!isControllable || isToggling) return;
    
    setIsToggling(true);
    try {
      await toggle();
      toast({
        title: '✓ Dispositivo actualizado',
        description: `${displayName} ahora está ${!active ? getNextStateLabel() : label}`,
      });
    } catch {
      toast({
        title: 'Error de conexión',
        description: 'No se pudo controlar el dispositivo. Intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsToggling(false);
    }
  };
  
  const getNextStateLabel = () => {
    switch (domain) {
      case 'switch':
      case 'light':
        return isOn ? 'apagado' : 'encendido';
      case 'cover':
      case 'motor':
        return isOpen ? 'cerrado' : 'abierto';
      case 'lock':
        return isLocked ? 'desbloqueado' : 'bloqueado';
      default:
        return '';
    }
  };
  
  const getActionButton = () => {
    // Si no tiene entityId o no está conectado y no es controlable
    if (!hasHomeAssistantEntity) {
      return (
        <div className="flex items-center gap-1.5 py-1.5 text-[10px] xs:text-xs text-muted-foreground">
          <WifiOff className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
          <span>Sin configuración</span>
        </div>
      );
    }
    
    if (!isControllable) {
      return (
        <div className="flex items-center gap-1.5 py-1.5 text-[10px] xs:text-xs text-muted-foreground">
          <span>Solo lectura</span>
        </div>
      );
    }
    
    // Si no está conectado después de intentar
    if (!isConnected && !isLoading) {
      return (
        <div className="flex items-center gap-1.5 py-1.5 text-[10px] xs:text-xs text-amber-500">
          <WifiOff className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
          <span>No responde</span>
        </div>
      );
    }
    
    const buttonContent = () => {
      if (isToggling || isLoading) {
        return <Loader2 className="w-4 h-4 animate-spin" />;
      }
      
      switch (domain) {
        case 'switch':
        case 'light':
          return (
            <>
              {isOn ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
              <span>{isOn ? 'Apagar' : 'Encender'}</span>
            </>
          );
        case 'cover':
        case 'motor':
          return (
            <>
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              <span>{isOpen ? 'Cerrar' : 'Abrir'}</span>
            </>
          );
        case 'lock':
          return (
            <>
              {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{isLocked ? 'Desbloquear' : 'Bloquear'}</span>
            </>
          );
        default:
          return <span>Toggle</span>;
      }
    };
    
    // Colores según dominio y estado para mejor affordance
    // SEMÁNTICA: Secundario = seguro/cerrado, Primario = abierto/activo
    const getButtonStyles = () => {
      if (domain === 'lock') {
        return isLocked
          ? 'text-white font-medium'
          : 'text-white font-medium';
      }
      if (domain === 'switch' || domain === 'light') {
        return isOn
          ? 'text-white font-medium'
          : 'text-white font-medium';
      }
      if (domain === 'cover' || domain === 'motor') {
        return isOpen
          ? 'text-white font-medium'
          : 'text-white font-medium';
      }
      return 'bg-primary hover:bg-primary/90';
    };
    
    // Obtener el color apropiado para el estado actual
    // IMPORTANTE: El botón muestra el color del ESTADO DESTINO (lo que pasará al hacer clic)
    // - Si está activo → botón para desactivar usa color secundario (seguro)
    // - Si está inactivo → botón para activar usa color primario (activo)
    const getButtonColor = () => {
      const isActiveState = (
        (domain === 'lock' && !isLocked) ||
        ((domain === 'switch' || domain === 'light') && isOn) ||
        ((domain === 'cover' || domain === 'motor') && isOpen)
      );
      // Invertido: si está activo, el botón lleva a estado seguro (secundario)
      // Si está inactivo, el botón lleva a estado activo (primario)
      return isActiveState ? secondaryColor : primaryColor;
    };

    const buttonColor = getButtonColor();
    const buttonInlineStyle = { 
      backgroundColor: buttonColor, 
      boxShadow: `0 4px 14px -3px ${buttonColor}40` 
    };
    
    return (
      <Button
        size="sm"
        variant="default"
        className={cn(
          'w-full gap-1.5 xs:gap-2 transition-all h-8 xs:h-9 text-xs xs:text-sm shadow-md',
          getButtonStyles()
        )}
        onClick={handleToggle}
        disabled={isToggling || isLoading}
        style={buttonInlineStyle}
      >
        {buttonContent()}
      </Button>
    );
  };
  
  // Color de la barra lateral según dominio y estado
  // SEMÁNTICA: Secundario = seguro/cerrado, Primario = abierto/activo
  const getSideBarStyle = (): React.CSSProperties | undefined => {
    const isActiveState = (
      (domain === 'lock' && !isLocked) ||
      ((domain === 'switch' || domain === 'light') && isOn) ||
      ((domain === 'cover' || domain === 'motor') && isOpen)
    );
    
    if (domain === 'lock' || domain === 'switch' || domain === 'light' || domain === 'cover' || domain === 'motor') {
      return { backgroundColor: isActiveState ? primaryColor : secondaryColor };
    }
    
    if (active) return { backgroundColor: secondaryColor };
    return { backgroundColor: 'hsl(var(--muted-foreground) / 0.3)' };
  };
  
  // Inline style para el badge cuando usa color de acento
  const getBadgeStyle = (): React.CSSProperties | undefined => {
    const isActiveState = (
      (domain === 'lock' && !isLocked) ||
      ((domain === 'switch' || domain === 'light') && isOn) ||
      ((domain === 'cover' || domain === 'motor') && isOpen)
    );
    
    if (domain === 'lock' || domain === 'switch' || domain === 'light' || domain === 'cover' || domain === 'motor') {
      const color = isActiveState ? primaryColor : secondaryColor;
      return { backgroundColor: `${color}20`, color };
    }
    
    return undefined;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -1 }}
      className={cn(
        'relative overflow-hidden rounded-lg xs:rounded-xl',
        'bg-card/95 backdrop-blur-sm',
        'border transition-all duration-200',
        active ? 'border-primary/30 shadow-md' : 'border-border/40',
        isControllable && 'hover:border-primary/50',
        className
      )}
    >
      {/* Status indicator bar - LEFT SIDE */}
      <div className={cn(
        'absolute top-0 left-0 bottom-0 w-1 rounded-l-lg xs:rounded-l-xl transition-colors duration-300',
        isToggling && 'animate-pulse'
      )} style={getSideBarStyle()} />
      
      <div className="p-2.5 xs:p-3 pl-3 xs:pl-4">
        {/* Header compacto */}
        <div className="flex items-center justify-between gap-2 mb-2 xs:mb-2.5">
          <div className="flex items-center gap-2 xs:gap-2.5 min-w-0 flex-1">
            <motion.div 
              className={cn(
                'p-1.5 xs:p-2 rounded-lg transition-colors shrink-0',
                active ? 'bg-primary/15' : 'bg-muted/80'
              )}
              animate={isToggling ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3, repeat: isToggling ? Infinity : 0 }}
            >
              <span className="text-base xs:text-lg">{getIcon()}</span>
            </motion.div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-xs xs:text-sm leading-tight truncate">{displayName}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[10px] xs:text-xs text-muted-foreground capitalize truncate">{roomDisplay}</p>
                {isConnected ? (
                  <Wifi className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-emerald-500/80 shrink-0" />
                ) : (
                  <WifiOff className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-muted-foreground/50 shrink-0" />
                )}
              </div>
            </div>
          </div>
          
          {/* Badge de estado */}
          <Badge 
            variant={active ? 'default' : 'secondary'}
            className="text-[9px] xs:text-[10px] px-1.5 xs:px-2 py-0.5 font-medium shrink-0"
            style={getBadgeStyle()}
          >
            {label}
          </Badge>
        </div>
        
        {/* Action button - compacto */}
        {getActionButton()}
      </div>
    </motion.div>
  );
}

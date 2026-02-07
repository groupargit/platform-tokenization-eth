import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, Unlock, DoorOpen, DoorClosed, 
  Wifi, WifiOff, Battery, BatteryLow, BatteryWarning,
  Activity, Shield, ShieldCheck, ChevronRight,
  Loader2, CheckCircle2, AlertCircle, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n";
import type { CategorizedDevice } from "@/hooks/useFirebaseDevices";

interface SmartDeviceCardProps {
  device: CategorizedDevice;
  onAction?: (device: CategorizedDevice, action: string) => Promise<void>;
  variant?: 'default' | 'compact' | 'minimal';
  showDetails?: boolean;
}

export function SmartDeviceCard({ 
  device, 
  onAction, 
  variant = 'default',
  showDetails = true 
}: SmartDeviceCardProps) {
  const { t } = useLanguage();
  const [isActioning, setIsActioning] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<boolean | null>(null);
  const { toast } = useToast();

  const isOnline = device.status === 'online';
  const isLocked = device.lastKnownState?.lock?.status === 'locked' || 
                   device.lastKnownState?.lock?.lockState === 'locked';
  const batteryLevel = device.battery?.batteryLevel || device.lastKnownState?.battery?.level;
  const isLowBattery = batteryLevel !== undefined && batteryLevel < 20;

  const handleAction = async (action: string) => {
    if (!onAction || isActioning) return;
    
    setIsActioning(true);
    setActionSuccess(null);
    
    try {
      await onAction(device, action);
      setActionSuccess(true);
      toast({
        title: t.common.success,
        description: t.common.actionSuccessDesc,
      });
      
      // Reset success state after animation
      setTimeout(() => setActionSuccess(null), 2000);
    } catch (error) {
      setActionSuccess(false);
      toast({
        title: "Error",
        description: "No se pudo ejecutar la acción",
        variant: "destructive",
      });
    } finally {
      setIsActioning(false);
    }
  };

  // Get device-specific icon
  const DeviceIcon = () => {
    if (device.category === 'lock') {
      return isLocked ? (
        <Lock className="w-6 h-6" />
      ) : (
        <Unlock className="w-6 h-6" />
      );
    }
    if (device.category === 'motor') {
      const isOpen = device.lastKnownState?.state === 'OPEN';
      return isOpen ? (
        <DoorOpen className="w-6 h-6" />
      ) : (
        <DoorClosed className="w-6 h-6" />
      );
    }
    if (device.category === 'security') {
      return isOnline ? (
        <ShieldCheck className="w-6 h-6" />
      ) : (
        <Shield className="w-6 h-6" />
      );
    }
    return <Activity className="w-6 h-6" />;
  };

  // Get status color based on device state
  const getStatusColor = () => {
    if (!isOnline) return 'text-muted-foreground';
    if (device.category === 'lock') {
      return isLocked ? 'text-emerald-500' : 'text-amber-500';
    }
    return 'text-primary';
  };

  // Battery indicator
  const BatteryIndicator = () => {
    if (batteryLevel === undefined) return null;
    
    const BatteryIcon = batteryLevel < 20 ? BatteryLow : 
                        batteryLevel < 50 ? BatteryWarning : Battery;
    
    return (
      <div className={cn(
        "flex items-center gap-1 text-xs",
        isLowBattery ? "text-destructive" : "text-muted-foreground"
      )}>
        <BatteryIcon className="w-3.5 h-3.5" />
        <span>{batteryLevel}%</span>
      </div>
    );
  };

  if (variant === 'minimal') {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => device.primaryAction && handleAction(device.primaryAction.action)}
        disabled={!isOnline || isActioning}
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl w-full",
          "bg-card/60 border border-border/50",
          "hover:bg-card hover:border-primary/30",
          "transition-all duration-300",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <div className={cn(
          "p-2 rounded-lg",
          isOnline ? "bg-primary/10" : "bg-muted"
        )}>
          <span className={getStatusColor()}>
            <DeviceIcon />
          </span>
        </div>
        
        <div className="flex-1 text-left">
          <p className="font-medium text-sm">{device.displayName}</p>
          <p className="text-xs text-muted-foreground">
            {device.category === 'lock' && (isLocked ? 'Bloqueado' : 'Desbloqueado')}
            {device.category === 'motor' && (device.lastKnownState?.state === 'OPEN' ? 'Abierto' : 'Cerrado')}
            {!['lock', 'motor'].includes(device.category) && (isOnline ? t.devices.connected : t.devices.disconnected)}
          </p>
        </div>

        {isActioning ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : actionSuccess === true ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : actionSuccess === false ? (
          <AlertCircle className="w-4 h-4 text-destructive" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </motion.button>
    );
  }

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative p-4 rounded-xl",
          "bg-gradient-to-br from-card/80 to-card/60",
          "border border-border/50",
          "backdrop-blur-sm"
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className={cn(
            "p-2.5 rounded-xl",
            isOnline ? "bg-primary/15" : "bg-muted"
          )}>
            <span className={getStatusColor()}>
              <DeviceIcon />
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <BatteryIndicator />
            <Badge 
              variant={isOnline ? "default" : "secondary"}
              className="text-[10px] px-1.5 py-0"
            >
              {isOnline ? (
                <span className="flex items-center gap-1">
                  <Wifi className="w-2.5 h-2.5" /> {t.devices.status.online}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <WifiOff className="w-2.5 h-2.5" /> {t.devices.status.offline}
                </span>
              )}
            </Badge>
          </div>
        </div>

        <h3 className="font-semibold text-sm mb-1">{device.displayName}</h3>
        <p className="text-xs text-muted-foreground mb-3">
          {device.location.room} • {device.manufacturer}
        </p>

        {device.primaryAction && (
          <Button
            size="sm"
            variant={isOnline ? "default" : "secondary"}
            disabled={!isOnline || isActioning}
            onClick={() => handleAction(device.primaryAction!.action)}
            className="w-full gap-2"
          >
            {isActioning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : actionSuccess === true ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            {device.primaryAction.label}
          </Button>
        )}
      </motion.div>
    );
  }

  // Default variant - full card
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-card to-card/80",
        "border border-border/50",
        "backdrop-blur-xl",
        "transition-all duration-500",
        "hover:border-primary/30 hover:shadow-xl"
      )}
    >
      {/* Status indicator strip */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        isOnline ? (device.category === 'lock' && isLocked ? "bg-emerald-500" : "bg-primary") : "bg-muted"
      )} />

      {/* Glow effect */}
      {isOnline && (
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at top, hsl(var(--primary)) 0%, transparent 50%)`,
          }}
        />
      )}

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={isActioning ? { rotate: [0, 5, -5, 0] } : {}}
              transition={{ duration: 0.3, repeat: isActioning ? Infinity : 0 }}
              className={cn(
                "p-3 rounded-xl",
                isOnline ? "bg-primary/15" : "bg-muted"
              )}
            >
              <span className={getStatusColor()}>
                <DeviceIcon />
              </span>
            </motion.div>
            
            <div>
              <h3 className="font-semibold">{device.displayName}</h3>
              <p className="text-xs text-muted-foreground">
                {device.manufacturer} {device.model}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <Badge 
              variant={isOnline ? "default" : "secondary"}
              className="text-xs"
            >
              {isOnline ? t.devices.status.online : t.devices.status.offline}
            </Badge>
            <BatteryIndicator />
          </div>
        </div>

        {/* Status info */}
        {showDetails && (
          <div className="mb-4 p-3 rounded-lg bg-background/50 border border-border/30">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estado actual</span>
              <span className={cn(
                "font-medium",
                device.category === 'lock' && isLocked && "text-emerald-500",
                device.category === 'lock' && !isLocked && "text-amber-500"
              )}>
                {device.category === 'lock' && (isLocked ? '🔒 Bloqueado' : '🔓 Desbloqueado')}
                {device.category === 'motor' && (device.lastKnownState?.state === 'OPEN' ? '🚪 Abierto' : '🚪 Cerrado')}
                {!['lock', 'motor'].includes(device.category) && (isOnline ? t.devices.status.active : t.devices.status.inactive)}
              </span>
            </div>
            
            {device.lastKnownState?.lock?.lastOperation && (
              <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-border/30">
                <span className="text-muted-foreground">Última operación</span>
                <span className="text-muted-foreground">
                  {new Date(device.lastKnownState.lock.lastOperation).toLocaleString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: 'short'
                  })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Battery progress */}
        {batteryLevel !== undefined && showDetails && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Batería</span>
              <span className={isLowBattery ? "text-destructive" : "text-muted-foreground"}>
                {batteryLevel}%
              </span>
            </div>
            <Progress 
              value={batteryLevel} 
              className={cn(
                "h-1.5",
                isLowBattery && "[&>div]:bg-destructive"
              )}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {device.primaryAction && (
            <Button
              variant={device.category === 'lock' && !isLocked ? "destructive" : "default"}
              disabled={!isOnline || isActioning}
              onClick={() => handleAction(device.primaryAction!.action)}
              className="flex-1 gap-2"
            >
              <AnimatePresence mode="wait">
                {isActioning ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </motion.div>
                ) : actionSuccess === true ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="icon"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    {device.category === 'lock' && (isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />)}
                    {device.category === 'motor' && (device.lastKnownState?.state === 'OPEN' ? <DoorClosed className="w-4 h-4" /> : <DoorOpen className="w-4 h-4" />)}
                    {!['lock', 'motor'].includes(device.category) && <Zap className="w-4 h-4" />}
                  </motion.div>
                )}
              </AnimatePresence>
              {device.primaryAction.label}
            </Button>
          )}
          
          {device.secondaryAction && (
            <Button
              variant="outline"
              size="icon"
              disabled={!isOnline}
              onClick={() => handleAction(device.secondaryAction!.action)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

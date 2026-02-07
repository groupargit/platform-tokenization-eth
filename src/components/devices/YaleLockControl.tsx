import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, Unlock, Shield, CheckCircle2, 
  AlertTriangle, AlertCircle, Battery
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useHomeAssistant } from "@/hooks/useHomeAssistant";
import { useEntranceDevices } from "@/hooks/useFirebaseDevices";
import { useAuth } from "@/hooks/useAuth";
import { useFirebaseUser, getUserIdFromEmail } from "@/hooks/useFirebase";
import { useApartmentColor } from "@/contexts/ApartmentColorContext";
import { useLanguage } from "@/i18n";

interface YaleLockControlProps {
  buildingId?: string;
  className?: string;
  apartmentId?: string;
}

type ActionPhase = 'idle' | 'processing' | 'success' | 'error';

export function YaleLockControl({ 
  buildingId = 'B001',
  className,
  apartmentId
}: YaleLockControlProps) {
  const { t } = useLanguage();
  const { mainLock, loading } = useEntranceDevices(buildingId);
  const [actionPhase, setActionPhase] = useState<ActionPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [actionType, setActionType] = useState<'lock' | 'unlock' | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  const { user: authUser, isAuthenticated } = useAuth();
  const userId = getUserIdFromEmail(authUser?.email);
  const { user: firebaseUser } = useFirebaseUser(userId);
  
  const hasAccess = useMemo(() => {
    if (!isAuthenticated || !firebaseUser) return false;
    if (apartmentId) {
      return (
        firebaseUser.primaryApartment === apartmentId ||
        (firebaseUser.apartments && apartmentId in firebaseUser.apartments)
      );
    }
    return (
      firebaseUser.primaryApartment != null ||
      (firebaseUser.apartments && Object.keys(firebaseUser.apartments).length > 0)
    );
  }, [isAuthenticated, firebaseUser, apartmentId]);
  
  const lockEntityId = useMemo(() => {
    if (!mainLock?.integration?.homeAssistant?.entityId) return null;
    return mainLock.integration.homeAssistant.entityId;
  }, [mainLock]);
  
  const {
    isLocked,
    isConnected: haIsConnected,
    error: haError,
    unlock: haUnlock,
    lock: haLock,
    optimisticLocked,
  } = useHomeAssistant({
    entityId: lockEntityId || undefined,
    autoRefresh: hasAccess && lockEntityId != null,
    refreshInterval: 4000,
  });

  const isProcessing = actionPhase === 'processing';
  
  // Use optimistic state for immediate visual feedback
  const displayLocked = useMemo(() => {
    // If we have optimistic state, use it for immediate feedback
    if (optimisticLocked !== null) return optimisticLocked;
    // Otherwise use the hook's computed state
    if (haIsConnected && lockEntityId) return isLocked;
    // Fallback to Firebase state
    if (mainLock?.lastKnownState?.lock) {
      return (
        mainLock.lastKnownState.lock.status === 'locked' || 
        mainLock.lastKnownState.lock.lockState === 'locked' ||
        mainLock.lastKnownState.lock.lockState === 'LOCKED'
      );
    }
    return false;
  }, [optimisticLocked, haIsConnected, isLocked, lockEntityId, mainLock?.lastKnownState]);

  // Obtener colores del apartamento
  const { primaryColor, secondaryColor } = useApartmentColor();

  const handleLockAction = useCallback(async (action: 'lock' | 'unlock') => {
    if (!hasAccess || !lockEntityId || isProcessing) return;
    
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    setProgress(0);
    setActionType(action);
    setActionPhase('processing');
    
    // Smooth progress animation
    let progressValue = 0;
    progressIntervalRef.current = setInterval(() => {
      progressValue += 5;
      if (progressValue <= 90) {
        setProgress(progressValue);
      }
    }, 30);
    
    try {
      if (action === 'unlock') {
        await haUnlock();
      } else {
        await haLock();
      }
      
      // Complete progress smoothly
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgress(100);
      setActionPhase('success');
      
      toast({
        title: action === 'unlock' ? `🔓 ${t.devices.doorOpened}` : `🔒 ${t.devices.doorClosed}`,
        description: action === 'unlock' ? t.devices.accessGranted : t.devices.securityActivated,
      });
      
      // Reset after animation completes
      setTimeout(() => {
        setActionPhase('idle');
        setProgress(0);
        setActionType(null);
      }, 800);
      
    } catch (error) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setActionPhase('error');
      setProgress(0);
      setActionType(null);
      
      toast({
        title: t.common.error,
        description: error instanceof Error ? error.message : t.errors.tryAgain,
        variant: 'destructive',
      });
      
      setTimeout(() => setActionPhase('idle'), 2000);
    }
  }, [hasAccess, lockEntityId, isProcessing, haUnlock, haLock, toast]);

  if (!hasAccess) return null;

  if (loading) {
    return (
      <div className={cn("glass-panel p-6", className)}>
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-14 h-14 rounded-2xl bg-muted" />
          <div className="flex-1">
            <div className="h-5 w-32 bg-muted rounded mb-2" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!mainLock) return null;

  // Colores dinámicos del apartamento
  const lockedColor = { 
    bg: `${secondaryColor}0d`, 
    border: `${secondaryColor}33`, 
    icon: secondaryColor 
  };
  const unlockedColor = { 
    bg: `${primaryColor}0d`, 
    border: `${primaryColor}33`, 
    icon: primaryColor 
  };
  // Color del botón = estado DESTINO
  const buttonColor = displayLocked ? primaryColor : secondaryColor;
  const currentColor = displayLocked ? lockedColor : unlockedColor;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass-panel overflow-hidden",
        "bg-gradient-to-br from-primary/5 via-card to-card",
        "border border-primary/20",
        className
      )}
    >
      {/* Progress Bar - color basado en la acción, no el estado */}
      <div className="h-1 bg-black/10 dark:bg-white/5 overflow-hidden">
        <motion.div
          className="h-full"
          style={{ 
            // Durante acción: secundario si cerrando, primario si abriendo
            // Idle: basado en estado actual (secundario=cerrado, primario=abierto)
            background: actionType !== null
              ? (actionType === 'lock' 
                  ? `linear-gradient(90deg, ${secondaryColor}, ${secondaryColor}cc)` 
                  : `linear-gradient(90deg, ${primaryColor}, ${primaryColor}cc)`)
              : (displayLocked 
                  ? `linear-gradient(90deg, ${secondaryColor}, ${secondaryColor}cc)` 
                  : `linear-gradient(90deg, ${primaryColor}, ${primaryColor}cc)`)
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.08, ease: "linear" }}
        />
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm text-muted-foreground">{t.devices.accessControl}</span>
        </div>

        {/* Main Control */}
        <motion.div 
          className="relative p-4 rounded-xl"
          animate={{
            backgroundColor: isProcessing ? 'rgba(128, 128, 128, 0.05)' : currentColor.bg,
            borderColor: isProcessing ? 'rgba(128, 128, 128, 0.15)' : currentColor.border,
          }}
          transition={{ duration: 0.3 }}
          style={{ border: '1px solid' }}
        >
          <div className="flex items-center gap-4">
            {/* Lock Icon */}
            <div className="relative flex-shrink-0">
              <motion.div
                className="p-3 rounded-xl"
                animate={{
                  backgroundColor: isProcessing 
                    ? 'rgba(128, 128, 128, 0.1)' 
                    : displayLocked 
                      ? `${secondaryColor}26` 
                      : `${primaryColor}26`
                }}
                transition={{ duration: 0.3 }}
              >
                <AnimatePresence mode="wait">
                  {actionPhase === 'success' ? (
                    <motion.div
                      key="success"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <CheckCircle2 className="w-7 h-7" style={{ color: secondaryColor }} />
                    </motion.div>
                  ) : actionPhase === 'error' ? (
                    <motion.div
                      key="error"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <AlertTriangle className="w-7 h-7 text-destructive" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`lock-${displayLocked}`}
                      initial={{ rotateY: 90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      exit={{ rotateY: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {displayLocked ? (
                        <Lock className="w-7 h-7" style={{ color: isProcessing ? '#888' : currentColor.icon }} />
                      ) : (
                        <Unlock className="w-7 h-7" style={{ color: isProcessing ? '#888' : currentColor.icon }} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              
              {isProcessing && (
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  style={{ border: '2px solid', borderColor: currentColor.icon }}
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 1.3, opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold">{t.devices.yaleLock}</h4>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={isProcessing ? 'processing' : `state-${displayLocked}`}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 mt-0.5"
                >
                  {isProcessing ? (
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <motion.span
                        className="w-1.5 h-1.5 rounded-full bg-primary"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                      />
                      {displayLocked ? t.devices.status.opening : t.devices.status.closing}
                    </span>
                  ) : (
                    <span 
                      className="text-sm font-medium"
                      style={{ color: currentColor.icon }}
                    >
                      {displayLocked ? `🔒 ${t.devices.lockedSafe}` : `🔓 ${t.devices.openShort}`}
                    </span>
                  )}
                </motion.div>
              </AnimatePresence>
              
              <p className="text-xs text-muted-foreground mt-1">{t.devices.mainEntrance}</p>
            </div>

            {/* Action Button */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`btn-${displayLocked}-${isProcessing}`}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  size="lg"
                  disabled={isProcessing || !hasAccess || !lockEntityId}
                  onClick={() => handleLockAction(displayLocked ? 'unlock' : 'lock')}
                  className={cn(
                    "h-11 px-5 font-semibold shadow-md transition-all duration-200 text-white",
                    isProcessing && "opacity-70"
                  )}
                  style={{
                    // Botón usa color del estado DESTINO
                    backgroundColor: isProcessing ? '#6b7280' : buttonColor,
                    boxShadow: isProcessing ? undefined : `0 4px 14px -3px ${buttonColor}40`,
                  }}
                >
                  {isProcessing ? (
                    <motion.div
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <span className="flex items-center gap-2">
                      {displayLocked ? (
                        <>
                          <Unlock className="w-4 h-4" />
                          {t.devices.actions.open}
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          {t.devices.actions.close}
                        </>
                      )}
                    </span>
                  )}
                </Button>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          {mainLock.battery && (
            <span className="flex items-center gap-1">
              <Battery className={cn(
                "w-3.5 h-3.5",
                (mainLock.battery.batteryLevel || 0) < 20 && "text-destructive"
              )} />
              {mainLock.battery.batteryLevel || 0}%
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              haIsConnected ? "bg-emerald-500" : "bg-muted-foreground"
            )} />
            {haIsConnected ? t.devices.status.online : t.devices.connecting}
          </span>
        </div>

        {/* Solo mostrar error si no hay acción exitosa reciente */}
        {haError && actionPhase === 'idle' && optimisticLocked === null && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3"
          >
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{t.devices.reconnecting}</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

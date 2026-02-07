import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, Unlock, Car, 
  Loader2, CheckCircle2, AlertTriangle,
  Zap, ChevronDown, AlertCircle,
  History, Battery, Wifi,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useEntranceDevices, CategorizedDevice } from "@/hooks/useFirebaseDevices";
import { useHomeAssistant } from "@/hooks/useHomeAssistant";
import { useFirebaseUser, getUserIdFromEmail } from "@/hooks/useFirebase";
import { useAuth } from "@/hooks/useAuth";
import { useApartmentColor } from "@/contexts/ApartmentColorContext";
import { useLanguage } from "@/i18n";

interface QuickAccessControlsProps {
  buildingId?: string;
  onDeviceAction?: (device: CategorizedDevice, action: string) => Promise<void>;
  className?: string;
}

// ============================================
// COMPONENTES DE UI OPTIMIZADOS (UX PRINCIPLES)
// ============================================

// Popup de recompensa - Feedback inmediato (Principio de Retroalimentación)
function RewardPopup({ points, show }: { points: number; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          className="absolute -top-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg">
            <Sparkles className="w-3.5 h-3.5" />
            +{points} UTO
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Indicador de estado de conexión - Visibilidad del estado del sistema
function StatusDot({ status, size = "sm" }: { status: "online" | "offline" | "loading"; size?: "sm" | "md" }) {
  const sizeClasses = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";
  
  return (
    <motion.div
      animate={status === "loading" ? { scale: [1, 1.3, 1] } : {}}
      transition={{ duration: 0.8, repeat: status === "loading" ? Infinity : 0 }}
      className={cn(
        sizeClasses, "rounded-full",
        status === "online" && "bg-emerald-500",
        status === "offline" && "bg-amber-500",
        status === "loading" && "bg-primary"
      )}
    />
  );
}

// Historial compacto - Información progresiva (Progressive Disclosure)
function CompactHistory({ primaryColor, secondaryColor, doorOpenedLabel, doorClosedLabel }: { primaryColor: string; secondaryColor: string; doorOpenedLabel: string; doorClosedLabel: string }) {
  const recentAccesses = [
    { id: 1, action: 'unlock' as const, time: 'Hace 2 min', method: 'App' },
    { id: 2, action: 'lock' as const, time: 'Hace 15 min', method: 'Auto' },
    { id: 3, action: 'unlock' as const, time: 'Hace 1h', method: 'Teclado' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="pt-4 space-y-2">
        {recentAccesses.map((access, idx) => (
          <motion.div
            key={access.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30"
          >
            <div className="flex items-center gap-2.5">
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: access.action === 'unlock' 
                    ? `${primaryColor}1a` 
                    : `${secondaryColor}1a`
                }}
              >
                {access.action === 'unlock' ? (
                  <Unlock className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                ) : (
                  <Lock className="w-3.5 h-3.5" style={{ color: secondaryColor }} />
                )}
              </div>
              <div>
                <span 
                  className="text-sm font-medium"
                  style={{ color: access.action === 'unlock' ? primaryColor : secondaryColor }}
                >
                  {access.action === 'unlock' ? doorOpenedLabel : doorClosedLabel}
                </span>
                <span className="text-xs text-muted-foreground ml-2">{access.method}</span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{access.time}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================
// CONTROL PRINCIPAL DE LA CERRADURA
// Principios: Fitts (botón grande), Feedback inmediato, Affordance clara
// ============================================
function MainLockControl({ 
  mainLock, 
  isLocked, 
  isLoading, 
  actionState,
  onAction,
  hasAccess,
  isConnected,
  haError,
  lockProgress,
  showReward,
  apartmentColor,
  apartmentSecondaryColor,
}: {
  mainLock: CategorizedDevice;
  isLocked: boolean;
  isLoading: boolean;
  actionState: 'idle' | 'loading' | 'success' | 'error';
  onAction: (action: 'lock' | 'unlock') => void;
  hasAccess: boolean;
  isConnected: boolean;
  haError: string | null;
  lockProgress: number;
  showReward: boolean;
  /** Color primario del apartamento para estado desbloqueado */
  apartmentColor?: string | null;
  /** Color secundario del apartamento para estado bloqueado */
  apartmentSecondaryColor?: string | null;
}) {
  const { t } = useLanguage();
  const batteryLevel = mainLock.battery?.batteryLevel || 0;
  const batteryLow = batteryLevel < 20;
  const targetAction = isLocked ? 'unlock' : 'lock';
  
  // Estilos dinámicos basados en el color del apartamento
  const unlockedBgColor = apartmentColor ? `${apartmentColor}14` : undefined;
  const unlockedBorderColor = apartmentColor ? `${apartmentColor}33` : undefined;
  const unlockedIconBgColor = apartmentColor ? `${apartmentColor}26` : undefined;
  
  // Estilos para estado bloqueado con color secundario
  const lockedBgColor = apartmentSecondaryColor ? `${apartmentSecondaryColor}14` : undefined;
  const lockedBorderColor = apartmentSecondaryColor ? `${apartmentSecondaryColor}33` : undefined;
  const lockedIconBgColor = apartmentSecondaryColor ? `${apartmentSecondaryColor}26` : undefined;

  return (
    <motion.div
      layout
      className="relative"
    >
      {/* Card principal - Diseño limpio con jerarquía clara */}
      <div className={cn(
        "relative rounded-2xl p-4 transition-colors duration-300"
      )}
      style={isLocked 
        ? (apartmentSecondaryColor ? { 
            backgroundColor: lockedBgColor, 
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: lockedBorderColor 
          } : { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(16, 185, 129, 0.2)' })
        : (apartmentColor ? { 
            backgroundColor: unlockedBgColor, 
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: unlockedBorderColor 
          } : { backgroundColor: 'rgba(245, 158, 11, 0.08)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(245, 158, 11, 0.2)' })
      }
      >
        {/* Reward popup */}
        <RewardPopup points={5} show={showReward} />

        {/* Layout: Info izquierda, Acción derecha (Ley de Fitts - zona de acción accesible) */}
        <div className="flex items-center justify-between gap-4">
          {/* Información del dispositivo */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icono con estado visual */}
            <motion.div
              className={cn(
                "relative flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
              )}
              style={isLocked 
                ? (apartmentSecondaryColor ? { backgroundColor: lockedIconBgColor } : { backgroundColor: 'rgba(16, 185, 129, 0.15)' })
                : (apartmentColor ? { backgroundColor: unlockedIconBgColor } : { backgroundColor: 'rgba(245, 158, 11, 0.15)' })
              }
              animate={actionState === 'loading' ? { scale: [1, 1.03, 1] } : {}}
              transition={{ duration: 0.5, repeat: actionState === 'loading' ? Infinity : 0 }}
            >
              <AnimatePresence mode="wait">
                {actionState === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  </motion.div>
                ) : actionState === 'error' ? (
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
                    key={`icon-${isLocked}`}
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isLocked ? (
                        <Lock 
                          className={cn("w-7 h-7", isLoading && "text-muted-foreground")} 
                          style={!isLoading && apartmentSecondaryColor ? { color: apartmentSecondaryColor } : !isLoading ? { color: '#10b981' } : undefined}
                        />
                    ) : (
                      <Unlock 
                        className={cn("w-7 h-7", isLoading && "text-muted-foreground")} 
                        style={!isLoading && apartmentColor ? { color: apartmentColor } : !isLoading ? { color: '#f59e0b' } : undefined}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Pulsing ring cuando está procesando */}
              {actionState === 'loading' && (
                <motion.div
                    className="absolute inset-0 rounded-xl border-2"
                    style={isLocked 
                      ? (apartmentSecondaryColor ? { borderColor: `${apartmentSecondaryColor}80` } : { borderColor: 'rgba(16, 185, 129, 0.5)' })
                      : (apartmentColor ? { borderColor: `${apartmentColor}80` } : { borderColor: 'rgba(245, 158, 11, 0.5)' })
                    }
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.3, opacity: 0 }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
            </motion.div>

            {/* Texto descriptivo - Claro y conciso */}
            <div className="min-w-0">
              <h3 className="font-semibold text-base truncate">{t.devices.mainEntrance}</h3>
              
              {/* Estado actual con transición suave */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={isLoading ? 'loading' : `state-${isLocked}`}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.15 }}
                    className={cn("text-sm font-medium", isLoading && "text-muted-foreground")}
                    style={!isLoading 
                      ? (isLocked 
                          ? (apartmentSecondaryColor ? { color: apartmentSecondaryColor } : { color: '#10b981' })
                          : (apartmentColor ? { color: apartmentColor } : { color: '#f59e0b' })
                        )
                      : undefined
                    }
                >
                  {isLoading 
                    ? (targetAction === 'unlock' ? t.devices.status.opening : t.devices.status.closing)
                    : (isLocked ? t.devices.lockedSafe : t.devices.openShort)
                  }
                </motion.p>
              </AnimatePresence>

              {/* Indicadores secundarios - Información no esencial */}
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5">
                  <StatusDot status={isConnected ? "online" : "offline"} />
                  <span className="text-xs text-muted-foreground">
                    {isConnected ? t.devices.connected : t.devices.reconnecting}
                  </span>
                </div>
                
                {mainLock.battery && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs",
                    batteryLow ? "text-destructive" : "text-muted-foreground"
                  )}>
                    <Battery className="w-3.5 h-3.5" />
                    {batteryLevel}%
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BOTÓN DE ACCIÓN PRINCIPAL - Grande y accesible (Ley de Fitts) */}
          <motion.div
            whileHover={{ scale: hasAccess && !isLoading ? 1.02 : 1 }}
            whileTap={{ scale: hasAccess && !isLoading ? 0.97 : 1 }}
            className="flex-shrink-0"
          >
            <Button
              size="lg"
              disabled={isLoading || !hasAccess}
              onClick={() => onAction(targetAction)}
                className={cn(
                  "h-14 w-20 font-bold text-sm shadow-lg transition-all duration-200 flex flex-col gap-0.5 text-white",
                  isLoading && "opacity-70",
                  !hasAccess && "opacity-50"
                )}
                style={isLocked
                  ? (apartmentColor 
                      ? { background: `linear-gradient(to bottom right, ${apartmentColor}, ${apartmentColor}cc)`, boxShadow: `0 4px 14px -3px ${apartmentColor}40` }
                      : { background: 'linear-gradient(to bottom right, #3F51B5, #303F9F)', boxShadow: '0 4px 14px -3px rgba(63, 81, 181, 0.3)' }
                    )
                  : (apartmentSecondaryColor 
                      ? { background: `linear-gradient(to bottom right, ${apartmentSecondaryColor}, ${apartmentSecondaryColor}cc)`, boxShadow: `0 4px 14px -3px ${apartmentSecondaryColor}40` }
                      : { background: 'linear-gradient(to bottom right, #81D4FA, #4FC3F7)', boxShadow: '0 4px 14px -3px rgba(129, 212, 250, 0.3)' }
                    )
                }
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  <span className="text-xs">{isLocked ? t.devices.actions.open : t.devices.actions.close}</span>
                </>
              )}
            </Button>
          </motion.div>
        </div>

        {/* Barra de progreso minimalista */}
        {lockProgress > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 h-1 rounded-full bg-muted/30 overflow-hidden"
          >
            <motion.div
                className="h-full rounded-full"
                style={isLocked 
                  ? (apartmentSecondaryColor ? { backgroundColor: apartmentSecondaryColor } : { backgroundColor: '#10b981' })
                  : (apartmentColor ? { backgroundColor: apartmentColor } : { backgroundColor: '#f59e0b' })
                }
              initial={{ width: 0 }}
              animate={{ width: `${lockProgress}%` }}
              transition={{ duration: 0.05, ease: "linear" }}
            />
          </motion.div>
        )}

        {/* Mensaje de acceso no autorizado */}
        {!hasAccess && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-border/30"
          >
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Necesitas un apartamento asignado para controlar la cerradura</span>
            </div>
          </motion.div>
        )}

        {/* Error de conexión */}
        {haError && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 pt-3 border-t border-border/30"
          >
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg">
              <Wifi className="w-4 h-4 flex-shrink-0 animate-pulse" />
              <span>{t.devices.reconnecting}</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// CONTROL SECUNDARIO DEL PARQUEADERO
// Diseño más compacto para acción secundaria
// ============================================
function SecondaryGateControl({ 
  mainGate, 
  actionState, 
  onAction 
}: { 
  mainGate: CategorizedDevice;
  actionState: 'idle' | 'loading' | 'success' | 'error';
  onAction: () => void;
}) {
  const { t } = useLanguage();
  const isOpen = mainGate.lastKnownState?.state === 'OPEN';
  
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onAction}
      disabled={mainGate.status !== 'online' || actionState === 'loading'}
      className={cn(
        "w-full flex items-center justify-between p-3.5 rounded-xl",
        "bg-muted/30 border border-border/40",
        "hover:bg-muted/50 hover:border-primary/30",
        "transition-all duration-200 group",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          "bg-primary/10 group-hover:bg-primary/15 transition-colors"
        )}>
          <Car className="w-5 h-5 text-primary" />
        </div>
        <div className="text-left">
          <p className="font-medium text-sm">{t.devices.parking}</p>
          <div className="flex items-center gap-1.5">
            <StatusDot status={mainGate.status === 'online' ? 'online' : 'offline'} />
            <span className="text-xs text-muted-foreground">
              {isOpen ? t.devices.gateOpen : t.devices.gateClosed}
            </span>
          </div>
        </div>
      </div>

      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center",
        "bg-background/60 group-hover:bg-primary/10 transition-colors"
      )}>
        {actionState === 'loading' ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : actionState === 'success' ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : (
          <Car className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
      </div>
    </motion.button>
  );
}

// ============================================
// COMPONENTE PRINCIPAL EXPORTADO
// ============================================
export function QuickAccessControls({ 
  buildingId = 'B001',
  onDeviceAction,
  className 
}: QuickAccessControlsProps) {
  const { t } = useLanguage();
  const { mainLock, mainGate, entranceDevices, loading, isConfigured } = useEntranceDevices(buildingId);
  const [showHistory, setShowHistory] = useState(false);
  const [actionStates, setActionStates] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [lockProgress, setLockProgress] = useState(0);
  const [_lockActionType, setLockActionType] = useState<'lock' | 'unlock' | null>(null);
  const [showReward, setShowReward] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  const { user: authUser, isAuthenticated } = useAuth();
  const userId = getUserIdFromEmail(authUser?.email);
  const { user: firebaseUser } = useFirebaseUser(userId);
  
  // Obtener colores del apartamento desde el contexto global
  const { primaryColor: apartmentColor, secondaryColor: apartmentSecondaryColor } = useApartmentColor();
  
  const hasAssignedApartment = firebaseUser?.primaryApartment != null || 
    (firebaseUser?.apartments && Object.keys(firebaseUser.apartments).length > 0);
  
  const lockEntityId = mainLock?.integration?.homeAssistant?.entityId || null;
  
  const {
    isLocked: haIsLocked,
    isLoading: haIsLoading,
    isConnected: haIsConnected,
    error: haError,
    unlock: haUnlock,
    lock: haLock,
    optimisticLocked,
  } = useHomeAssistant({
    entityId: lockEntityId || undefined,
    autoRefresh: hasAssignedApartment && isAuthenticated && lockEntityId != null,
    refreshInterval: 4000,
  });
  
  const shouldUseHomeAssistant = hasAssignedApartment && isAuthenticated && haIsConnected;

  const handleLockAction = async (action: 'lock' | 'unlock') => {
    if (!mainLock) return;
    
    if (!hasAssignedApartment) {
      toast({
        title: "Acceso no autorizado",
        description: "Necesitas tener un apartamento asignado",
        variant: "destructive",
      });
      return;
    }
    
    setActionStates(prev => ({ ...prev, [mainLock.deviceId]: 'loading' }));
    setLockProgress(0);
    setLockActionType(action);
    
    let progressValue = 0;
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      progressValue += 4;
      if (progressValue <= 90) {
        setLockProgress(progressValue);
      }
    }, 25);
    
    try {
      if (action === 'unlock') {
        await haUnlock();
      } else {
        await haLock();
      }
      
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setLockProgress(100);
      setActionStates(prev => ({ ...prev, [mainLock.deviceId]: 'success' }));
      
      setShowReward(true);
      setTimeout(() => setShowReward(false), 2000);
      
      toast({
        title: action === 'unlock' ? t.devices.doorOpened : t.devices.doorClosed,
        description: (
          <span className="flex items-center gap-1.5">
            {action === 'unlock' ? t.devices.accessGranted : t.devices.securityActivated}
            <span className="text-amber-500 font-semibold">+5 UTO</span>
          </span>
        ),
      });
      
      setTimeout(() => {
        setActionStates(prev => ({ ...prev, [mainLock.deviceId]: 'idle' }));
        setLockProgress(0);
        setLockActionType(null);
      }, 1000);
    } catch {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setLockProgress(0);
      setLockActionType(null);
      setActionStates(prev => ({ ...prev, [mainLock.deviceId]: 'error' }));
      
      toast({
        title: t.common.error,
        description: t.errors.actionFailed,
        variant: 'destructive',
      });
      
      setTimeout(() => {
        setActionStates(prev => ({ ...prev, [mainLock.deviceId]: 'idle' }));
      }, 2000);
    }
  };

  const handleGateAction = async () => {
    if (!mainGate) return;
    
    setActionStates(prev => ({ ...prev, [mainGate.deviceId]: 'loading' }));
    
    if (!onDeviceAction) {
      // Mock
      await new Promise(resolve => setTimeout(resolve, 1500));
      setActionStates(prev => ({ ...prev, [mainGate.deviceId]: 'success' }));
      toast({ title: t.devices.parkingActivated });
      setTimeout(() => {
        setActionStates(prev => ({ ...prev, [mainGate.deviceId]: 'idle' }));
      }, 2000);
      return;
    }
    
    const action = mainGate.lastKnownState?.state === 'OPEN' ? 'close' : 'open';
    
    try {
      await onDeviceAction(mainGate, action);
      setActionStates(prev => ({ ...prev, [mainGate.deviceId]: 'success' }));
    } catch {
      setActionStates(prev => ({ ...prev, [mainGate.deviceId]: 'error' }));
    }
    
    setTimeout(() => {
      setActionStates(prev => ({ ...prev, [mainGate.deviceId]: 'idle' }));
    }, 2000);
  };

  // Estado de carga - Skeleton minimalista
  if (!isConfigured || loading) {
    return (
      <div className={cn("space-y-3 animate-pulse", className)}>
        <div className="rounded-2xl bg-muted/30 p-4 border border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-muted/50" />
            <div className="flex-1">
              <div className="h-4 w-32 bg-muted/50 rounded mb-2" />
              <div className="h-3 w-24 bg-muted/50 rounded" />
            </div>
            <div className="w-20 h-14 bg-muted/50 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!mainLock && !mainGate) return null;

  const isLockLocked = (() => {
    if (optimisticLocked !== null) return optimisticLocked;
    if (shouldUseHomeAssistant) return haIsLocked;
    return mainLock?.lastKnownState?.lock?.status === 'locked' || 
           mainLock?.lastKnownState?.lock?.lockState === 'locked';
  })();
  
  const lockActionState = actionStates[mainLock?.deviceId || ''] || 'idle';
  const gateActionState = actionStates[mainGate?.deviceId || ''] || 'idle';
  const isLockLoading = shouldUseHomeAssistant ? haIsLoading : lockActionState === 'loading';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("space-y-3", className)}
    >
      {/* Header simple - Solo información esencial */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-primary" />
          <h2 className="font-semibold text-sm text-foreground">{t.devices.quickAccess}</h2>
        </div>
        
        <Badge 
          variant="outline" 
          className="text-xs px-2 py-0.5 bg-primary/5 border-primary/20 text-primary"
        >
          <Zap className="w-3 h-3 mr-1" />
          {entranceDevices.filter(d => d.status === 'online').length} activos
        </Badge>
      </div>

      {/* Control principal de la cerradura */}
      {mainLock && (
        <MainLockControl
          mainLock={mainLock}
          isLocked={isLockLocked}
          isLoading={isLockLoading}
          actionState={lockActionState}
          onAction={handleLockAction}
          hasAccess={hasAssignedApartment}
          isConnected={haIsConnected}
          haError={haError ? String(haError) : null}
          lockProgress={lockProgress}
          showReward={showReward}
          apartmentColor={apartmentColor}
          apartmentSecondaryColor={apartmentSecondaryColor}
        />
      )}

      {/* Control secundario del parqueadero */}
      {mainGate && (
        <SecondaryGateControl
          mainGate={mainGate}
          actionState={gateActionState}
          onAction={handleGateAction}
        />
      )}

      {/* Toggle de historial - Progressive Disclosure */}
      {hasAssignedApartment && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full h-9 gap-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30"
          >
            <History className="w-3.5 h-3.5" />
            {showHistory ? 'Ocultar actividad' : 'Ver actividad reciente'}
            <ChevronDown className={cn(
              "w-3.5 h-3.5 transition-transform ml-auto",
              showHistory && "rotate-180"
            )} />
          </Button>

          <AnimatePresence>
            {showHistory && <CompactHistory primaryColor={apartmentColor} secondaryColor={apartmentSecondaryColor} doorOpenedLabel={t.devices.doorOpened} doorClosedLabel={t.devices.doorClosed} />}
          </AnimatePresence>
        </>
      )}

      {/* Footer con gamificación sutil - No intrusivo */}
      {hasAssignedApartment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 pt-2"
        >
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span className="text-amber-500 font-medium">+5 UTO</span>
            <span>por cada acceso seguro</span>
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Lock, Unlock, Cpu, ChevronRight, 
  Loader2, CheckCircle2, AlertCircle, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEntranceDevices } from "@/hooks/useFirebaseDevices";
import { useHomeAssistant } from "@/hooks/useHomeAssistant";
import { useFirebaseUser, getUserIdFromEmail } from "@/hooks/useFirebase";
import { useAuth } from "@/hooks/useAuth";
import { useApartmentDevices } from "@/hooks/useApartmentDevices";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n";
import { useApartmentColor } from "@/contexts/ApartmentColorContext";

interface QuickAccessSummaryProps {
  buildingId?: string;
  className?: string;
}

/**
 * Componente resumen compacto para Tu Espacio
 * Muestra estado rápido de accesos + resumen de dispositivos con enlace a /devices
 */
export function QuickAccessSummary({ 
  buildingId = 'B001',
  className 
}: QuickAccessSummaryProps) {
  const { mainLock, loading: lockLoading, isConfigured } = useEntranceDevices(buildingId);
  const { user: authUser, isAuthenticated } = useAuth();
  const userId = getUserIdFromEmail(authUser?.email);
  const { user: firebaseUser } = useFirebaseUser(userId);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { primaryColor, secondaryColor } = useApartmentColor();
  
  // Obtener apartamento del usuario
  const primaryApartment = firebaseUser?.primaryApartment || 
    (firebaseUser?.apartments ? Object.keys(firebaseUser.apartments)[0] : null);
  
  const { stats, loading: devicesLoading } = useApartmentDevices(buildingId, primaryApartment);
  
  const hasAccess = firebaseUser?.primaryApartment != null || 
    (firebaseUser?.apartments && Object.keys(firebaseUser.apartments).length > 0);
  
  const lockEntityId = mainLock?.integration?.homeAssistant?.entityId || null;
  
  const {
    isLocked: haIsLocked,
    isLoading: haIsLoading,
    isConnected: haIsConnected,
    unlock: haUnlock,
    lock: haLock,
    optimisticLocked,
  } = useHomeAssistant({
    entityId: lockEntityId || undefined,
    autoRefresh: hasAccess && isAuthenticated && lockEntityId != null,
    refreshInterval: 5000,
  });

  const currentLockState = optimisticLocked ?? haIsLocked;
  const isLocked = currentLockState ?? true;

  const handleQuickToggle = async () => {
    if (!hasAccess || haIsLoading) return;
    
    try {
      if (isLocked) {
        await haUnlock();
        toast({ title: t.devices.doorOpened, description: t.devices.doorOpenedDesc });
      } else {
        await haLock();
        toast({ title: t.devices.doorClosed, description: t.devices.doorClosedDesc });
      }
    } catch {
      toast({ 
        title: t.devices.connectionError, 
        description: t.devices.connectionErrorDesc,
        variant: "destructive"
      });
    }
  };

  if (!isConfigured) return null;

  const loading = lockLoading || devicesLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass-panel overflow-hidden", className)}
    >
      {/* Header compacto */}
      <div className="flex items-center justify-between p-3 xs:p-4 border-b border-border/30">
        <div className="flex items-center gap-2 xs:gap-3">
          <div className="p-1.5 xs:p-2 rounded-lg bg-primary/10">
            <Cpu className="w-4 h-4 xs:w-5 xs:h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm xs:text-base">{t.devices.quickAccess}</h3>
            <p className="text-[10px] xs:text-xs text-muted-foreground">
              {stats.esp32Online}/{stats.esp32Total} {t.devices.quickAccessSubtitle}
            </p>
          </div>
        </div>
        
        <Link to="/devices">
          <Button variant="ghost" size="sm" className="gap-1 h-7 xs:h-8 text-xs">
            {t.common.viewAll}
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {/* Control principal de acceso */}
      <div className="p-3 xs:p-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : mainLock ? (
          <div className="flex items-center justify-between gap-3">
            {/* Estado de la cerradura */}
            <div className="flex items-center gap-2 xs:gap-3 min-w-0 flex-1">
              <motion.div
                className={cn(
                  "relative shrink-0 w-10 h-10 xs:w-12 xs:h-12 rounded-xl flex items-center justify-center"
                )}
                style={{ 
                  backgroundColor: isLocked 
                    ? `${secondaryColor}20` // Color secundario del apartamento con 12% opacity para cerrado
                    : `${primaryColor}20` // Color del apartamento con 12% opacity para abierto
                }}
                animate={haIsLoading ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.6, repeat: haIsLoading ? Infinity : 0 }}
              >
                <AnimatePresence mode="wait">
                  {haIsLoading ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Loader2 className="w-5 h-5 xs:w-6 xs:h-6 animate-spin text-primary" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`lock-${isLocked}`}
                      initial={{ rotateY: 90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      exit={{ rotateY: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {isLocked ? (
                        <Lock className="w-5 h-5 xs:w-6 xs:h-6" style={{ color: secondaryColor }} />
                      ) : (
                        <Unlock className="w-5 h-5 xs:w-6 xs:h-6" style={{ color: primaryColor }} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              
              <div className="min-w-0">
                <p className="font-medium text-sm xs:text-base truncate">{t.devices.mainEntrance}</p>
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    haIsConnected ? "bg-emerald-500" : "bg-amber-500"
                  )} />
                  <span 
                    className="text-[10px] xs:text-xs font-medium"
                    style={{ 
                      color: isLocked ? secondaryColor : primaryColor 
                    }}
                  >
                    {haIsLoading 
                      ? (isLocked ? t.devices.status.opening : t.devices.status.closing) 
                      : (isLocked ? t.devices.status.closed : t.devices.status.open)
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Botón de acción */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="sm"
                disabled={haIsLoading || !hasAccess}
                onClick={handleQuickToggle}
                  className="h-10 xs:h-12 w-14 xs:w-16 font-bold shadow-lg flex flex-col gap-0.5 text-white"
                  style={{ 
                    background: isLocked 
                      ? `linear-gradient(to bottom right, ${primaryColor}, ${primaryColor}dd)` // Botón "Abrir" usa primario (destino: activo)
                      : `linear-gradient(to bottom right, ${secondaryColor}, ${secondaryColor}dd)` // Botón "Cerrar" usa secundario (destino: seguro)
                  }}
              >
                {haIsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    <span className="text-[10px]">{isLocked ? t.devices.actions.open : t.devices.actions.close}</span>
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">{t.devices.noAccessConfigured}</span>
          </div>
        )}

        {/* No access warning */}
        {mainLock && !hasAccess && (
          <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] xs:text-xs">{t.devices.needAssignedSpace}</span>
          </div>
        )}
      </div>

      {/* Resumen de dispositivos - Link a /devices */}
      {stats.total > 0 && (
        <Link to="/devices">
          <motion.div 
            className="flex items-center justify-between p-3 xs:p-4 bg-muted/20 border-t border-border/30 hover:bg-muted/40 transition-colors cursor-pointer"
            whileHover={{ x: 2 }}
          >
            <div className="flex items-center gap-3 xs:gap-4">
              <div className="flex -space-x-1">
                <Badge variant="outline" className="text-[9px] xs:text-[10px] px-1.5 h-5 border-primary/30 bg-primary/5">
                  💡 {stats.actuators}
                </Badge>
                <Badge variant="outline" className="text-[9px] xs:text-[10px] px-1.5 h-5 border-serenity/30 bg-serenity/5">
                  📊 {stats.sensors}
                </Badge>
              </div>
              <div>
                <p className="text-xs xs:text-sm font-medium">{stats.total} {t.devices.total.toLowerCase()}</p>
                <p className="text-[9px] xs:text-[10px] text-muted-foreground">
                  {stats.active} {t.devices.active.toLowerCase()} • {t.devices.tapToManage}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </Link>
      )}
    </motion.div>
  );
}

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Palette, ArrowRight, Lock, Unlock, Wifi, ChevronUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColorSwatch } from "@/components/ui/color-swatch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ApartmentCardProps } from "@/types/apartment";
import { useLanguage } from "@/i18n";

interface EnhancedApartmentCardProps extends ApartmentCardProps {
  showQuickActions?: boolean;
  isUserApartment?: boolean;
  lockStatus?: 'locked' | 'unlocked' | 'unknown';
  devicesOnline?: number;
  onQuickAction?: (action: 'lock' | 'unlock') => void;
}

export function ApartmentCard({ 
  apartment, 
  index, 
  onClick,
  showQuickActions = false,
  isUserApartment = false,
  lockStatus = 'unknown',
  devicesOnline = 0,
  onQuickAction,
}: EnhancedApartmentCardProps) {
  const { t } = useLanguage();
  const { name, concept, colorCode, id } = apartment;
  const primaryColor = colorCode[0];
  const secondaryColor = colorCode[1];
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleQuickAction = async (e: React.MouseEvent, action: 'lock' | 'unlock') => {
    e.stopPropagation();
    if (!onQuickAction || actionLoading) return;
    
    setActionLoading(true);
    try {
      await onQuickAction(action);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="group cursor-pointer touch-manipulation"
      onClick={onClick}
    >
      <div 
        className={cn(
          "relative overflow-hidden rounded-xl md:rounded-2xl p-4 md:p-6 h-full",
          "bg-card/80 backdrop-blur-xl border border-border/50",
          "transition-all duration-500",
          "hover:border-primary/30 hover:shadow-2xl",
          "active:bg-card/90",
          isUserApartment && "border-primary/40 ring-1 ring-primary/20"
        )}
        style={{
          background: `linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--card)) 80%)`,
          minHeight: isExpanded ? '320px' : '220px',
        }}
      >
        {/* Glow effect */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-xl md:rounded-2xl"
          style={{
            background: `radial-gradient(ellipse at center, ${primaryColor}40 0%, transparent 70%)`,
          }}
        />

        {/* Color accent bar */}
        <div 
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl md:rounded-t-2xl opacity-80 group-hover:opacity-100 transition-opacity"
          style={{
            background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
          }}
        />

        {/* User apartment indicator */}
        {isUserApartment && (
          <div className="absolute top-2 right-2">
            <Badge 
              variant="default" 
              className="text-[10px] bg-primary/90 text-primary-foreground"
            >
              Tu espacio
            </Badge>
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-3 md:mb-4">
            <div 
              className="p-2 md:p-3 rounded-lg md:rounded-xl transition-all duration-300 group-hover:scale-110"
              style={{ 
                backgroundColor: `${primaryColor}20`,
                border: `1px solid ${primaryColor}30`,
              }}
            >
              <Home 
                className="w-5 h-5 md:w-6 md:h-6 transition-colors duration-300" 
                style={{ color: primaryColor }}
              />
            </div>
            
            <span 
              className="text-[10px] md:text-xs font-mono px-1.5 md:px-2 py-0.5 md:py-1 rounded-full"
              style={{ 
                backgroundColor: `${primaryColor}15`,
                color: primaryColor,
              }}
            >
              {id.replace('apt_', '#').replace('local_', 'L')}
            </span>
          </div>

          {/* Name & Concept */}
          <div className="flex-1">
            <h3 
              className="font-display text-lg md:text-xl font-semibold mb-1 md:mb-2 transition-colors duration-300 line-clamp-1"
              style={{ color: primaryColor }}
            >
              {name}
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-3 md:mb-4">
              {concept}
            </p>
          </div>

          {/* Color palette */}
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Palette className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
            <div className="flex -space-x-1.5 md:-space-x-2">
              {colorCode.slice(0, 4).map((color, i) => (
                <ColorSwatch 
                  key={i} 
                  color={color} 
                  size="sm" 
                  className="ring-2 ring-card w-5 h-5 md:w-6 md:h-6"
                  showTooltip={false}
                />
              ))}
            </div>
          </div>

          {/* Quick access controls for user apartments */}
          {showQuickActions && isUserApartment && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-3 space-y-2"
              >
                {/* Status indicators */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div 
                      className="flex items-center gap-1 px-2 py-1 rounded-full"
                      style={lockStatus === 'locked' 
                        ? { backgroundColor: `${secondaryColor}15`, color: secondaryColor }
                        : lockStatus === 'unlocked' 
                          ? { backgroundColor: `${primaryColor}15`, color: primaryColor }
                          : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
                      }
                    >
                      {lockStatus === 'locked' ? (
                        <Lock className="w-3 h-3" style={{ color: secondaryColor }} />
                      ) : lockStatus === 'unlocked' ? (
                        <Unlock className="w-3 h-3" style={{ color: primaryColor }} />
                      ) : (
                        <Lock className="w-3 h-3" />
                      )}
                      <span className="font-medium">
                        {lockStatus === 'locked' ? t.devices.secure : 
                         lockStatus === 'unlocked' ? t.devices.openShort : '—'}
                      </span>
                    </div>
                  </div>
                  
                  {devicesOnline > 0 && (
                    <div className="flex items-center gap-1 text-primary">
                      <Wifi className="w-3 h-3" />
                      <span>{devicesOnline} {t.devices.status.online.toLowerCase()}</span>
                    </div>
                  )}
                </div>

                {/* Expandable quick actions */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleExpand}
                  className="w-full text-xs h-7 gap-1"
                >
                  <Zap className="w-3 h-3" />
                  {t.devices.quickActions}
                  <ChevronUp className={cn(
                    "w-3 h-3 transition-transform",
                    !isExpanded && "rotate-180"
                  )} />
                </Button>

                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="sm"
                      className="flex-1 text-xs h-8 text-white border-0"
                      disabled={actionLoading}
                      onClick={(e) => handleQuickAction(e, lockStatus === 'locked' ? 'unlock' : 'lock')}
                      style={{
                        // Botón usa color del ESTADO DESTINO
                        backgroundColor: lockStatus === 'locked' 
                          ? primaryColor // Abrir -> estado activo -> primario
                          : secondaryColor, // Cerrar -> estado seguro -> secundario
                        boxShadow: `0 2px 8px -2px ${lockStatus === 'locked' ? primaryColor : secondaryColor}50`
                      }}
                    >
                      {lockStatus === 'locked' ? (
                        <>
                          <Unlock className="w-3 h-3 mr-1" />
                          Abrir
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 mr-1" />
                          Bloquear
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Action - visible on hover (desktop) or always subtle (mobile) */}
          <div 
            className={cn(
              "flex items-center gap-2 text-xs md:text-sm font-medium transition-all duration-300",
              "md:opacity-0 md:translate-x-[-10px] md:group-hover:opacity-100 md:group-hover:translate-x-0",
              "opacity-70"
            )}
            style={{ color: primaryColor }}
          >
            <span>Ver detalles</span>
            <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Sun, Moon, Sunrise, Sunset, 
  Building2, Wifi, Trophy, Sparkles, Star,
  RefreshCcw, Zap, Shield, 
  Home, Droplets, Flame, Leaf
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { QuickAccessControls } from "@/components/devices/QuickAccessControls";
import { FirebaseApartment, FirebaseBuilding, FirebaseUser } from "@/hooks/useFirebase";
import { FirebaseUserData } from "@/hooks/useFirebaseUserSync";
import { useApartmentColor } from "@/contexts/ApartmentColorContext";
import { useLanguage } from "@/i18n";

// Tipo union para aceptar ambos tipos de usuario
type UserData = FirebaseUser | FirebaseUserData;

interface ResidentDashboardProps {
  firebaseUser: UserData;
  apartments: FirebaseApartment[];
  userApartments: FirebaseApartment[];
  building: FirebaseBuilding | null;
  onRefresh?: () => void;
  onApartmentClick?: (apt: FirebaseApartment) => void;
}

// Saludo dinámico basado en la hora del día
function getDynamicGreeting(greetings: { morning: string; afternoon: string; evening: string }): { text: string; icon: typeof Sun; period: string } {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return { text: greetings.morning, icon: Sunrise, period: "morning" };
  } else if (hour >= 12 && hour < 18) {
    return { text: greetings.afternoon, icon: Sun, period: "afternoon" };
  } else if (hour >= 18 && hour < 21) {
    return { text: greetings.afternoon, icon: Sunset, period: "evening" };
  } else {
    return { text: greetings.evening, icon: Moon, period: "night" };
  }
}

// Obtener el nombre del usuario de forma más amigable
function getDisplayName(user: UserData): string {
  if (user.name) {
    const firstName = user.name.split(' ')[0];
    return firstName;
  }
  return user.userId;
}

// Componente de tarjeta de estadísticas - optimizado para móvil
function StatCard({ 
  icon: Icon, 
  value, 
  label, 
  color = "primary",
  delay = 0 
}: { 
  icon: typeof Building2; 
  value: string | number; 
  label: string; 
  color?: "primary" | "serenity" | "accent" | "nature";
  delay?: number;
}) {
  const colorClasses = {
    primary: "text-primary",
    serenity: "text-[hsl(var(--serenity))]",
    accent: "text-accent",
    nature: "text-[hsl(var(--nature))]"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "glass-panel p-2.5 xs:p-3 sm:p-4 text-center",
        "hover:border-primary/30 transition-all duration-300",
        "group cursor-default"
      )}
    >
      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Icon className={cn("w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 xs:mb-2", colorClasses[color])} />
      </motion.div>
      <div className="font-display text-lg xs:text-xl sm:text-2xl font-bold">{value}</div>
      <div className="text-[10px] xs:text-xs text-muted-foreground truncate">{label}</div>
    </motion.div>
  );
}

// Componente para mostrar el apartamento del usuario con el colorCode - responsive
function ApartmentColorCard({ apartment }: { apartment: FirebaseApartment }) {
  const { t } = useLanguage();
  const primaryColor = apartment.colorCode?.[0] || "#5C7AFF";
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="relative overflow-hidden rounded-xl xs:rounded-2xl p-3 xs:p-4 sm:p-5 mb-4 xs:mb-5 sm:mb-6"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}05 100%)`,
        borderColor: `${primaryColor}30`,
        borderWidth: '1px',
        borderStyle: 'solid'
      }}
    >
      {/* Glow decorativo */}
      <div 
        className="absolute -top-16 xs:-top-20 -right-16 xs:-right-20 w-32 xs:w-40 h-32 xs:h-40 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: primaryColor }}
      />
      
      <div className="relative flex items-center justify-between gap-2 xs:gap-3">
        <div className="flex items-center gap-2 xs:gap-3 sm:gap-4 min-w-0">
          {/* Color swatch del apartamento - responsive */}
          <div className="flex gap-0.5 xs:gap-1 shrink-0">
            {apartment.colorCode?.slice(0, 4).map((color, idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="w-2 xs:w-2.5 sm:w-3 h-8 xs:h-10 sm:h-12 rounded-full shadow-lg"
                style={{ 
                  backgroundColor: color,
                  boxShadow: `0 4px 12px ${color}40`
                }}
              />
            ))}
          </div>
          
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 xs:gap-2 mb-0.5 xs:mb-1">
              <Home className="w-3 h-3 xs:w-4 xs:h-4 shrink-0" style={{ color: primaryColor }} />
              <span className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground">{t.home.yourSpace}</span>
            </div>
            <h3 className="font-display text-base xs:text-lg sm:text-xl font-bold truncate">{apartment.name}</h3>
            <p className="text-xs xs:text-sm text-muted-foreground truncate">{apartment.concept}</p>
          </div>
        </div>
        
        {/* Badge de tipo - responsive */}
        <Badge 
          variant="outline" 
          className="border-primary/30 text-[10px] xs:text-xs shrink-0 hidden xs:flex"
          style={{ borderColor: `${primaryColor}50` }}
        >
          {apartment.type === 'private' ? 'Residencial' : 'Comercial'}
        </Badge>
      </div>
    </motion.div>
  );
}

// Componente para mostrar el progreso de gamificación
function GamificationProgress({ user }: { user: UserData }) {
  const { level, points, progress, nextLevel } = user.gamification || {
    level: 1,
    points: 0,
    progress: 0,
    nextLevel: { level: 2, points: 500 }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="glass-panel p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-accent/20">
            <Star className="w-4 h-4 text-accent" />
          </div>
          <span className="font-medium text-sm">Nivel {level}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {points.toLocaleString()} / {nextLevel?.points?.toLocaleString() || '500'} pts
        </span>
      </div>
      
      <div className="relative">
        <Progress value={progress} className="h-2" />
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div 
            className="h-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
            style={{ width: '30%', transform: `translateX(${progress * 3}%)` }}
          />
        </motion.div>
      </div>
      
      <p className="text-xs text-muted-foreground mt-2 text-center">
        ⚡ +5 UTO por cada acceso registrado
      </p>
    </motion.div>
  );
}

// Componente de indicadores de servicios
function ServicesIndicator() {
  const services = [
    { icon: Droplets, label: "Agua", status: "normal", color: "hsl(var(--serenity))" },
    { icon: Flame, label: "Gas", status: "normal", color: "hsl(var(--accent))" },
    { icon: Zap, label: "Energía", status: "normal", color: "hsl(var(--nature))" },
    { icon: Wifi, label: "Internet", status: "online", color: "hsl(var(--primary))" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="glass-panel p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Leaf className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">Servicios del Hogar</span>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {services.map((service, idx) => (
          <motion.div
            key={service.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 + idx * 0.1 }}
            className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/30"
          >
            <div 
              className="p-1.5 rounded-full"
              style={{ backgroundColor: `${service.color}20` }}
            >
              <service.icon 
                className="w-3.5 h-3.5" 
                style={{ color: service.color }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{service.label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export function ResidentDashboard({
  firebaseUser,
  apartments: _apartments,
  userApartments,
  building,
  onRefresh,
  onApartmentClick: _onApartmentClick
}: ResidentDashboardProps) {
  const { t } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const greeting = getDynamicGreeting(t.greetings);
  const GreetingIcon = greeting.icon;
  const { primaryColor: apartmentColor } = useApartmentColor();
  
  const userDisplayName = getDisplayName(firebaseUser);
  const primaryApartment = userApartments[0];
  
  // Calcular dispositivos online (mock por ahora, se puede conectar a Firebase)
  const onlineDevices = useMemo(() => {
    if (!building?.zones) return 0;
    // Contar dispositivos ESP32 online en las zonas del edificio
    let count = 0;
    Object.values(building.zones).forEach((zone: any) => {
      if (zone.esp32Devices) {
        count += Object.values(zone.esp32Devices).filter(
          (d: any) => d.status === 'online'
        ).length;
      }
    });
    return count || 5; // Default si no hay data
  }, [building]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    onRefresh?.();
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4 xs:space-y-5 sm:space-y-6"
    >
      {/* Header con saludo dinámico - responsive */}
      <div className="flex items-center justify-between gap-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 xs:gap-3 min-w-0"
        >
          <motion.div
            animate={{ 
              rotate: greeting.period === 'night' ? [0, 10, -10, 0] : 0,
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="p-1.5 xs:p-2 rounded-lg xs:rounded-xl shrink-0"
            style={{ backgroundColor: `${apartmentColor}1A` }}
          >
            <GreetingIcon className="w-5 h-5 xs:w-6 xs:h-6" style={{ color: apartmentColor }} />
          </motion.div>
          <div className="min-w-0">
            <h1 className="font-display text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold truncate">
              {greeting.text}, <span style={{ color: apartmentColor }}>{userDisplayName}</span>
            </h1>
            <p className="text-xs xs:text-sm text-muted-foreground truncate">
              {building?.buildingName || 'Casa Color'}
            </p>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="shrink-0"
        >
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 xs:gap-2 h-8 xs:h-9 px-2 xs:px-3"
          >
            <RefreshCcw className={cn(
              "w-3.5 h-3.5 xs:w-4 xs:h-4",
              isRefreshing && "animate-spin"
            )} />
            <span className="hidden xs:inline text-xs xs:text-sm">{t.common.refresh}</span>
          </Button>
        </motion.div>
      </div>

      {/* Tarjetas de estadísticas personalizadas - responsive grid */}
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 gap-2 xs:gap-3 sm:gap-4">
        <StatCard 
          icon={Building2} 
          value={userApartments.length} 
          label={t.home.spaces} 
          color="primary"
          delay={0.1}
        />
        <StatCard 
          icon={Wifi} 
          value={onlineDevices} 
          label={t.home.available} 
          color="serenity"
          delay={0.15}
        />
        <StatCard 
          icon={Trophy} 
          value={firebaseUser.gamification?.points?.toLocaleString() || '0'} 
          label="Mis Puntos" 
          color="accent"
          delay={0.2}
        />
        <StatCard 
          icon={Sparkles} 
          value={firebaseUser.gamification?.level || 1} 
          label="Mi Nivel" 
          color="nature"
          delay={0.25}
        />
      </div>

      {/* Mostrar el apartamento principal con su colorCode */}
      {primaryApartment && (
        <ApartmentColorCard apartment={primaryApartment} />
      )}

      {/* Quick Access Controls */}
      <QuickAccessControls 
        buildingId={building?.buildingId || 'B001'} 
        className="mb-6"
      />

      {/* Grid de gamificación y servicios - 2 columnas en móvil también */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 xs:gap-4">
        <GamificationProgress user={firebaseUser} />
        <ServicesIndicator />
      </div>

      {/* Mensaje de seguridad */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl"
        style={{ 
          backgroundColor: `${apartmentColor}0D`,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: `${apartmentColor}1A`
        }}
      >
        <Shield className="w-4 h-4" style={{ color: apartmentColor }} />
        <span className="text-xs text-muted-foreground">
          Tu espacio está protegido con acceso inteligente y monitoreo 24/7
        </span>
      </motion.div>
    </motion.div>
  );
}

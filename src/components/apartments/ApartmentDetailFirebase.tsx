import { motion } from "framer-motion";
import { ArrowLeft, Palette, Sparkles, Home, Lightbulb, MapPin, Check, X, Cpu, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColorSwatch } from "@/components/ui/color-swatch";
import { useFirebaseZone, FirebaseApartment, useFirebaseUser, getUserIdFromEmail } from "@/hooks/useFirebase";
import { useAuth } from "@/hooks/useAuth";
import { YaleLockControl } from "@/components/devices/YaleLockControl";
import { useLanguage } from "@/i18n";

interface ApartmentDetailFirebaseProps {
  apartment: FirebaseApartment;
  onBack: () => void;
  showStudyRequestButton?: boolean;
  onRequestStudy?: () => void;
}

export function ApartmentDetailFirebase({ 
  apartment, 
  onBack, 
  showStudyRequestButton = false,
  onRequestStudy 
}: ApartmentDetailFirebaseProps) {
  const { t } = useLanguage();
  const { zone, loading: zoneLoading } = useFirebaseZone('B001', apartment.apartmentId);
  
  // Obtener usuario autenticado y verificar si tiene este apartamento asignado
  const { user: authUser, isAuthenticated } = useAuth();
  const userId = getUserIdFromEmail(authUser?.email);
  const { user: firebaseUser } = useFirebaseUser(userId);
  
  // Verificar si el usuario tiene este apartamento asignado
  const isUserApartment = isAuthenticated && firebaseUser && (
    firebaseUser.primaryApartment === apartment.apartmentId ||
    (firebaseUser.apartments && apartment.apartmentId in firebaseUser.apartments)
  );
  
  const { 
    name, 
    concept, 
    colorCode, 
    description, 
    features, 
    price, 
    type, 
    available, 
    images,
    automationRoutines 
  } = apartment;
  
  const primaryColor = colorCode?.[0] || '#3F51B5';
  const secondaryColor = colorCode?.[1] || '#81D4FA';

  // Get IoT devices from zone data
  const iotDevices = zone?.iotDevices ? Object.values(zone.iotDevices) : [];
  const esp32Devices = zone?.esp32Devices ? Object.values(zone.esp32Devices) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="max-w-5xl mx-auto"
    >
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-6 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver
      </Button>

      {/* Yale Lock Control - Solo mostrar si el usuario tiene este apartamento asignado */}
      {isUserApartment && (
        <div className="mb-6">
          <YaleLockControl 
            buildingId="B001" 
            apartmentId={apartment.apartmentId}
          />
        </div>
      )}

      {/* Header */}
      <div className="glass-panel p-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Color preview */}
          <div
            className="w-24 h-24 rounded-2xl flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            }}
          />

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1
                className="font-display text-3xl md:text-4xl font-bold"
                style={{ color: primaryColor }}
              >
                {name}
              </h1>
              <Badge variant={available ? "default" : "secondary"}>
                {available ? "Disponible" : "Ocupado"}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {type === 'commercial' ? 'Comercial' : 'Privado'}
              </Badge>
            </div>
            <p className="text-lg text-muted-foreground mb-4">{concept}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
            
            {/* Price */}
            <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                  ${typeof price === 'number' ? price.toLocaleString() : price}
                </span>
                <span className="text-muted-foreground">/mes</span>
              </div>
              
              {/* Study Request Button - shown when user has no apartments */}
              {showStudyRequestButton && onRequestStudy && (
                <Button
                  onClick={onRequestStudy}
                  size="lg"
                  className="gap-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Home className="w-4 h-4" />
                  Solicitar estudio
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Color palette */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-display font-semibold">Paleta de colores</h3>
          </div>
          <div className="flex flex-wrap gap-4">
            {colorCode?.map((color, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <ColorSwatch color={color} size="lg" />
                <span className="text-xs font-mono text-muted-foreground">{color}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      {features && features.length > 0 && (
        <div className="glass-panel p-8 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5" style={{ color: primaryColor }} />
            <h2 className="font-display text-xl font-semibold">Características</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                <Check className="w-5 h-5 text-green-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IoT Devices */}
      {(iotDevices.length > 0 || esp32Devices.length > 0) && (
        <div className="glass-panel p-8 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Cpu className="w-5 h-5" style={{ color: secondaryColor }} />
            <h2 className="font-display text-xl font-semibold">{t.devices.iotDevices}</h2>
          </div>
          
          {/* ESP32 Devices */}
          {esp32Devices.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{t.devices.esp32Tooltip}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {esp32Devices.map((device: any, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-secondary/30 border border-border/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{device.deviceName}</span>
                      <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                        {device.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{device.location}</p>
                    <p className="text-xs text-muted-foreground mt-1">IP: {device.ipAddress}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* IoT Sensors/Actuators */}
          {iotDevices.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Sensores y Actuadores</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {iotDevices.map((device: any, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-secondary/20 border border-border/20"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className={`w-2 h-2 rounded-full ${device.status === 'active' ? 'bg-green-500' : 'bg-muted'}`} 
                      />
                      <span className="text-sm font-medium">{device.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">
                      {device.type} - {device.parameters?.location}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Automation Routines */}
      {automationRoutines && automationRoutines.length > 0 && (
        <div className="glass-panel p-8 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Lightbulb className="w-5 h-5" style={{ color: primaryColor }} />
            <h2 className="font-display text-xl font-semibold">Rutinas de automatización</h2>
          </div>
          <div className="space-y-3">
            {automationRoutines.map((routine, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/30"
              >
                <span className="font-medium">{routine.routineId.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-2">
                  {routine.enabled ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <Check className="w-3 h-3 mr-1" />
                      Activa
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <X className="w-3 h-3 mr-1" />
                      Inactiva
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Images */}
      {images && images.length > 0 && (
        <div className="glass-panel p-8">
          <div className="flex items-center gap-2 mb-6">
            <Image className="w-5 h-5" style={{ color: secondaryColor }} />
            <h2 className="font-display text-xl font-semibold">Galería</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="aspect-video rounded-xl overflow-hidden bg-secondary/30"
              >
                <img
                  src={img}
                  alt={`${name} - Imagen ${i + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Zone Color Palette from Firebase */}
      {zone?.colorPalette && (
        <div className="glass-panel p-8 mt-6">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="w-5 h-5" style={{ color: primaryColor }} />
            <h2 className="font-display text-xl font-semibold">Paleta detallada</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(zone.colorPalette).map(([key, value]: [string, any]) => (
              <div
                key={key}
                className="p-4 rounded-xl bg-secondary/30 border border-border/30"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-8 h-8 rounded-lg"
                    style={{ backgroundColor: value.hex }}
                  />
                  <div>
                    <h4 className="font-medium">{value.name}</h4>
                    <p className="text-xs font-mono text-muted-foreground">{value.hex}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{value.description}</p>
                <p className="text-xs text-muted-foreground mt-1 italic">Uso: {value.usage}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

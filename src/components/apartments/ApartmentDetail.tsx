import { motion } from "framer-motion";
import { ArrowLeft, Palette, Sparkles, Home, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorSwatch } from "@/components/ui/color-swatch";
import type { Apartment } from "@/types/apartment";

interface ApartmentDetailProps {
  apartment: Apartment;
  onBack: () => void;
}

export function ApartmentDetail({ apartment, onBack }: ApartmentDetailProps) {
  const { name, concept, colorCode, psychology, recommendedUse } = apartment;
  const primaryColor = colorCode[0];
  const secondaryColor = colorCode[1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto"
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

      {/* Header */}
      <div className="glass-panel p-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Color preview */}
          <div
            className="w-24 h-24 rounded-2xl flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            }}
          />

          <div className="flex-1">
            <h1
              className="font-display text-3xl md:text-4xl font-bold mb-2"
              style={{ color: primaryColor }}
            >
              {name}
            </h1>
            <p className="text-lg text-muted-foreground">{concept}</p>
          </div>
        </div>

        {/* Color palette */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-display font-semibold">Paleta de Colores</h3>
          </div>
          <div className="flex flex-wrap gap-4">
            {colorCode.map((color, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <ColorSwatch color={color} size="lg" />
                <span className="text-xs font-mono text-muted-foreground">{color}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Psychology section */}
      {psychology && (
        <div className="glass-panel p-8 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5" style={{ color: primaryColor }} />
            <h2 className="font-display text-xl font-semibold">Psicología del Color</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Primario</h4>
                <p className="text-sm">{psychology.primary}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Secundario</h4>
                <p className="text-sm">{psychology.secondary}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Acento</h4>
                <p className="text-sm">{psychology.accent}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Ambiente General</h4>
                <p className="text-sm">{psychology.overall}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommended use */}
      {recommendedUse && (
        <div className="glass-panel p-8">
          <div className="flex items-center gap-2 mb-6">
            <Lightbulb className="w-5 h-5" style={{ color: secondaryColor }} />
            <h2 className="font-display text-xl font-semibold">Uso Recomendado</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(recommendedUse).map(([key, value]) => (
              <div
                key={key}
                className="p-4 rounded-xl bg-secondary/30 border border-border/30"
              >
                <h4 className="text-sm font-medium capitalize mb-1" style={{ color: primaryColor }}>
                  {key}
                </h4>
                <p className="text-sm text-muted-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

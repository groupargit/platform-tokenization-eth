import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  CheckCircle2, 
  FileText, 
  Upload, 
  AlertCircle,
  Sparkles,
  Phone,
  Mail,
  Calendar
} from "lucide-react";

interface WaitlistApplication {
  revisionId: string;
  status: "pending" | "reviewing" | "documents_required" | "approved" | "rejected";
  appliedAt: string;
}

interface WaitlistStatusProps {
  application: WaitlistApplication;
  onUploadDocuments?: () => void;
}

const statusConfig = {
  pending: {
    title: "Solicitud recibida",
    description: "Tu solicitud está en cola para revisión. Te contactaremos pronto.",
    icon: Clock,
    color: "text-accent",
    bgColor: "bg-accent/10",
    progress: 25,
  },
  reviewing: {
    title: "En revisión",
    description: "Nuestro equipo está evaluando tu solicitud. ¡Buenas noticias pronto!",
    icon: FileText,
    color: "text-serenity",
    bgColor: "bg-serenity/10",
    progress: 50,
  },
  documents_required: {
    title: "Documentos pendientes",
    description: "Necesitamos algunos documentos adicionales para continuar.",
    icon: Upload,
    color: "text-warmth",
    bgColor: "bg-warmth/10",
    progress: 60,
  },
  approved: {
    title: "¡Aprobado!",
    description: "Felicidades, tu solicitud ha sido aprobada. Te contactaremos para los siguientes pasos.",
    icon: CheckCircle2,
    color: "text-primary",
    bgColor: "bg-primary/10",
    progress: 100,
  },
  rejected: {
    title: "No aprobado",
    description: "Lamentamos informarte que tu solicitud no fue aprobada. Contáctanos para más información.",
    icon: AlertCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    progress: 0,
  },
};

export function WaitlistStatus({ application, onUploadDocuments }: WaitlistStatusProps) {
  const config = statusConfig[application.status];
  const StatusIcon = config.icon;
  
  const appliedDate = new Date(application.appliedAt).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-panel border-primary/20 overflow-hidden">
        <CardHeader className={`${config.bgColor} border-b border-border/50`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${config.bgColor}`}>
              <StatusIcon className={`w-6 h-6 ${config.color}`} />
            </div>
            <div>
              <CardTitle className="text-xl">{config.title}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progreso de tu solicitud</span>
              <span className={config.color}>{config.progress}%</span>
            </div>
            <Progress value={config.progress} className="h-2" />
          </div>
          
          {/* Application info */}
          <div className="glass-panel p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Fecha de solicitud:</span>
              <span className="font-medium">{appliedDate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">ID de solicitud:</span>
              <span className="font-mono text-xs">{application.revisionId}</span>
            </div>
          </div>
          
          {/* Actions based on status */}
          {application.status === "documents_required" && (
            <div className="space-y-4">
              <div className="glass-panel p-4 border-warmth/30 bg-warmth/5">
                <div className="flex items-start gap-3">
                  <Upload className="w-5 h-5 text-warmth mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Documentos pendientes</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Por favor, sube los documentos solicitados para continuar con tu proceso.
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={onUploadDocuments} className="w-full gap-2">
                <Upload className="w-4 h-4" />
                Subir documentos
              </Button>
            </div>
          )}
          
          {application.status === "approved" && (
            <div className="glass-panel p-4 border-primary/30 bg-primary/5">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">¡Tu nuevo hogar te espera!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nuestro equipo se pondrá en contacto contigo en las próximas 24-48 horas 
                    para coordinar los siguientes pasos.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Contact info */}
          <div className="pt-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground mb-3">
              ¿Tienes preguntas? Estamos aquí para ayudarte
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" className="gap-2">
                <Phone className="w-4 h-4" />
                Llamar
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Mail className="w-4 h-4" />
                Escribir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

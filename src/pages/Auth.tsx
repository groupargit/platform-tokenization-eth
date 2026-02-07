import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth0 } from "@auth0/auth0-react";
import casaColorLogo from "@/assets/casa-color-logo.png";
import grouparLogo from "@/assets/groupar-logo.png";
import { useLanguage } from "@/i18n";

type AuthMode = "login" | "signup";

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginWithRedirect, isAuthenticated, isLoading: auth0Loading, error: auth0Error } = useAuth0();

  useEffect(() => {
    if (!auth0Loading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, auth0Loading, navigate]);

  useEffect(() => {
    if (auth0Loading) {
      timeoutRef.current = setTimeout(() => {
        setShowForm(true);
      }, 3000);
    } else {
      setShowForm(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [auth0Loading]);

  useEffect(() => {
    if (auth0Error) {
      console.error('Auth0 error:', auth0Error);
      setShowForm(true);
    }
  }, [auth0Error]);

  const handleAuth0Login = () => {
    loginWithRedirect();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.email || !formData.password) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Completa todos los campos",
      });
      setIsLoading(false);
      return;
    }

    if (mode === "signup" && formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Las contraseñas no coinciden",
      });
      setIsLoading(false);
      return;
    }

    loginWithRedirect({
      authorizationParams: {
        screen_hint: mode === "signup" ? "signup" : "login",
        login_hint: formData.email,
      }
    });
  };


  if (auth0Loading && !showForm) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
      <div 
        className="absolute top-1/4 -left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background: "linear-gradient(135deg, #3F51B5, #81D4FA)" }}
      />
      <div 
        className="absolute bottom-1/4 -right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background: "linear-gradient(135deg, #9C27B0, #F8BBD0)" }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-panel p-8">
          <motion.div 
            className="flex flex-col items-center mb-8"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <img 
              src={casaColorLogo} 
              alt="Casa Color" 
              className="w-20 h-20 object-contain mb-4"
            />
            <h1 className="font-display text-2xl font-bold gradient-text">
              Casa Color
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              El futuro de la vivienda inteligente
            </p>
          </motion.div>

          <Button
            onClick={handleAuth0Login}
            className="w-full mb-6 py-6 text-lg"
            size="lg"
          >
            <Shield className="w-5 h-5 mr-2" />
            Iniciar con Auth0
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">o continúa con correo</span>
            </div>
          </div>

          <div className="flex gap-2 mb-6 p-1 rounded-xl bg-secondary/50">
            <Button
              variant={mode === "login" ? "default" : "ghost"}
              className={`flex-1 ${mode === "login" ? "" : "text-muted-foreground"}`}
              onClick={() => setMode("login")}
            >
              Iniciar Sesión
            </Button>
            <Button
              variant={mode === "signup" ? "default" : "ghost"}
              className={`flex-1 ${mode === "signup" ? "" : "text-muted-foreground"}`}
              onClick={() => setMode("signup")}
            >
              Registrarse
            </Button>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input
                    id="name"
                    placeholder="Tu nombre"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-secondary/50 border-border/50"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 bg-secondary/50 border-border/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10 bg-secondary/50 border-border/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="pl-10 bg-secondary/50 border-border/50"
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="outline"
                className="w-full mt-6"
                disabled={isLoading}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    {mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </motion.form>
          </AnimatePresence>

          <div className="flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground">
            <img src={grouparLogo} alt="Groupar" className="w-4 h-4" />
            <span>Un producto de Groupar S.A.S</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

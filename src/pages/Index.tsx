import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, Palette, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useFirebaseApartments, useFirebaseBuilding } from "@/hooks/useFirebase";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n";
import casaColorLogo from "@/assets/casa-color-logo.png";
import grouparLogo from "@/assets/groupar-logo.png";
import grouparText from "@/assets/groupar-text.png";

export default function Index() {
  const navigate = useNavigate();
  const { apartments, loading } = useFirebaseApartments();
  const { building } = useFirebaseBuilding('B001');
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const features = [
    {
      icon: Shield,
      title: t.landing.features.security.title,
      description: t.landing.features.security.description,
    },
    {
      icon: Cpu,
      title: t.landing.features.iot.title,
      description: t.landing.features.iot.description,
    },
    {
      icon: Palette,
      title: t.landing.features.design.title,
      description: t.landing.features.design.description,
    },
    {
      icon: Zap,
      title: t.landing.features.energy.title,
      description: t.landing.features.energy.description,
    },
  ];

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      loginWithRedirect();
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 rounded-full blur-3xl opacity-20 bg-casa-indigo animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-64 md:w-96 h-64 md:h-96 rounded-full blur-3xl opacity-15 bg-casa-celeste animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full blur-3xl opacity-5 bg-gradient-radial from-primary to-transparent" />
      </div>

      <section className="relative min-h-screen flex items-center justify-center px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex mb-6 md:mb-8"
            >
              <img 
                src={casaColorLogo} 
                alt="Casa Color" 
                className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 object-contain drop-shadow-2xl"
              />
            </motion.div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-4 md:mb-6">
              <span className="gradient-text">{t.landing.title}</span>
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-4 px-4">
              {t.landing.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 px-4">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="group w-full sm:w-auto px-6 md:px-8 py-5 md:py-6 text-base md:text-lg glow-effect"
              >
                {t.landing.getStarted}
                <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="w-full sm:w-auto px-6 md:px-8 py-5 md:py-6 text-base md:text-lg bg-secondary/30 border-border/50"
              >
                {t.landing.viewApartments}
              </Button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-12 md:mt-16 flex justify-center items-center gap-2 md:gap-3 flex-wrap px-4"
            >
              {apartments.slice(0, 6).map((apt, i) => (
                <motion.div
                  key={apt.apartmentId}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  whileHover={{ scale: 1.2, y: -5 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border-2 border-border/30 shadow-lg cursor-pointer touch-manipulation"
                  style={{ backgroundColor: apt.colorCode?.[0] || '#3F51B5' }}
                  title={apt.name}
                  onClick={() => navigate('/dashboard')}
                />
              ))}
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
          >
            <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      <section className="relative py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10 md:mb-16"
          >
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4">
              {t.landing.features.title.split(' ').slice(0, -1).join(' ')} <span className="gradient-text">{t.landing.features.title.split(' ').slice(-1)}</span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto px-4">
              {t.landing.features.subtitle}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-panel p-4 md:p-6 hover:border-primary/30 transition-all hover:-translate-y-1"
              >
                <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-primary/10 border border-primary/20 w-fit mb-3 md:mb-4">
                  <feature.icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-sm md:text-base mb-1 md:mb-2">{feature.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-3 md:line-clamp-none">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative border-t border-border/50 py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <img 
                src={grouparLogo} 
                alt="Groupar" 
                className="w-8 h-8 md:w-10 md:h-10 object-contain"
              />
              <div className="flex flex-col">
                <img 
                  src={grouparText} 
                  alt="Groupar" 
                  className="h-4 md:h-5 object-contain"
                />
                <span className="text-[10px] md:text-xs text-muted-foreground">
                  {t.landing.footer.productBy}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <img 
                src={casaColorLogo} 
                alt="Casa Color" 
                className="w-6 h-6 md:w-8 md:h-8 object-contain"
              />
              <span className="font-display font-medium text-sm md:text-base gradient-text">{t.landing.title}</span>
            </div>
            
            <p className="text-xs md:text-sm text-muted-foreground text-center">
              {t.landing.footer.copyright}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

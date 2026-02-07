import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ref, set, push, get, update, serverTimestamp, onValue, off } from "firebase/database";
import { database, isFirebaseConfigured } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useFirebaseApartments } from "@/hooks/useFirebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentUploader } from "@/components/common";
import type { DocumentType } from "@/services/fileUploadService";
import { 
  FileText, 
  User, 
  Phone, 
  Mail, 
  CreditCard, 
  Building2, 
  Shield, 
  CheckCircle2, 
  Sparkles,
  Heart,
  Clock,
  ArrowRight,
  Upload,
  UserCheck,
  Loader2,
  Home
} from "lucide-react";

// Schema de validación con mensajes neurolinguísticos
const waitlistSchema = z.object({
  // Apartamento seleccionado (requerido)
  selectedApartmentId: z.string().min(1, "Por favor selecciona el espacio al que deseas aplicar"),
  
  // Datos personales
  // Nota: fullName y documentId se extraen automáticamente cuando se sube el idCard
  fullName: z.string().optional(),
  documentId: z.string().optional(),
  email: z.string().email("Ingresa un correo válido para mantenerte informado"),
  phone: z.string().min(10, "Un teléfono de contacto nos permite comunicarnos contigo rápidamente"),
  
  // Información laboral
  occupation: z.string().min(2, "Cuéntanos sobre tu profesión"),
  monthlyIncome: z.string().min(1, "Este dato es confidencial y solo se usa para el estudio"),
  employmentLetter: z.string().optional(),
  
  // Referencias bancarias
  bankName: z.string().min(2, "El nombre del banco es necesario"),
  accountType: z.string().min(2, "Tipo de cuenta"),
  
  // Deudor solidario
  guarantorName: z.string().min(3, "El nombre del deudor solidario es importante"),
  guarantorDocumentId: z.string().min(6, "Documento de identidad del deudor solidario"),
  guarantorPhone: z.string().min(10, "Teléfono de contacto del deudor solidario"),
  guarantorEmail: z.string().email("Correo del deudor solidario para verificación"),
  guarantorRelationship: z.string().min(2, "¿Cuál es tu relación con el deudor solidario?"),
  
  // Información adicional
  preferredApartmentType: z.string().optional(),
  moveInDate: z.string().optional(),
  additionalNotes: z.string().optional(),
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

interface WaitlistFormProps {
  userId: string;
  userEmail: string;
  userName?: string;
  onSuccess?: () => void;
}

export function WaitlistForm({ userId, userEmail, userName, onSuccess }: WaitlistFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [isLoadingRevision, setIsLoadingRevision] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [idCardFileId, setIdCardFileId] = useState<string | null>(null);
  const [idCardDataExtracted, setIdCardDataExtracted] = useState(false);
  const [isExtractingData, setIsExtractingData] = useState(false);
  const { toast } = useToast();
  const revisionIdRef = useRef<string | null>(null);
  const { apartments, loading: apartmentsLoading } = useFirebaseApartments();
  
  const availableApartments = useMemo(() => {
    return apartments.filter(apt => apt.available === true);
  }, [apartments]);
  
  const form = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      selectedApartmentId: "",
      fullName: userName || "",
      email: userEmail,
      documentId: "",
      phone: "",
      occupation: "",
      monthlyIncome: "",
      employmentLetter: "",
      bankName: "",
      accountType: "",
      guarantorName: "",
      guarantorDocumentId: "",
      guarantorPhone: "",
      guarantorEmail: "",
      guarantorRelationship: "",
      preferredApartmentType: "",
      moveInDate: "",
      additionalNotes: "",
    },
  });

  useEffect(() => {
    const initializeRevision = async () => {
      if (!isFirebaseConfigured || !database) {
        setIsLoadingRevision(false);
        return;
      }

      try {
        const userRef = ref(database, `users/${userId}/waitlistApplication`);
        const userSnapshot = await get(userRef);
        
        if (userSnapshot.exists()) {
          const application = userSnapshot.val();
          if (application.revisionId) {
            const revisionRef = ref(database, `revisions/${application.revisionId}`);
            const revisionSnapshot = await get(revisionRef);
            
            if (revisionSnapshot.exists()) {
              const revisionData = revisionSnapshot.val();
              setRevisionId(application.revisionId);
              revisionIdRef.current = application.revisionId;
              
              if (revisionData.selectedApartmentId) {
                form.setValue('selectedApartmentId', revisionData.selectedApartmentId);
              }
              
              if (revisionData.personalInfo) {
                form.setValue('fullName', revisionData.personalInfo.fullName || '');
                form.setValue('documentId', revisionData.personalInfo.documentId || '');
                form.setValue('email', revisionData.personalInfo.email || userEmail);
                form.setValue('phone', revisionData.personalInfo.phone || '');
                
                if (revisionData.documents?.idCard?.uploaded && revisionData.documents.idCard.fileId) {
                  setIdCardFileId(revisionData.documents.idCard.fileId);
                  
                  const fileRef = ref(database, `files/${revisionData.documents.idCard.fileId}`);
                  get(fileRef).then((fileSnapshot) => {
                    if (fileSnapshot.exists()) {
                      const fileData = fileSnapshot.val();
                      if (fileData.document_extracted_data) {
                        setIdCardDataExtracted(true);
                        const extractedData = fileData.document_extracted_data;
                        
                        if (extractedData.fullName?.value || extractedData.name?.value) {
                          const fullName = extractedData.fullName?.value || extractedData.name?.value;
                          form.setValue('fullName', fullName);
                        }
                        
                        if (extractedData.documentId?.value || extractedData.nit?.value || extractedData.cedula?.value) {
                          const documentId = extractedData.documentId?.value || extractedData.nit?.value || extractedData.cedula?.value;
                          const cleanDocumentId = documentId.replace(/[\s\-]/g, '');
                          form.setValue('documentId', cleanDocumentId);
                        }
                      }
                    }
                  }).catch(console.error);
                }
              }
              
              if (revisionData.employmentInfo) {
                form.setValue('occupation', revisionData.employmentInfo.occupation || '');
                form.setValue('monthlyIncome', revisionData.employmentInfo.monthlyIncome || '');
                form.setValue('employmentLetter', revisionData.employmentInfo.employmentLetter || '');
              }
              
              if (revisionData.financialInfo) {
                form.setValue('bankName', revisionData.financialInfo.bankName || '');
                form.setValue('accountType', revisionData.financialInfo.accountType || '');
              }
              
              if (revisionData.guarantor) {
                form.setValue('guarantorName', revisionData.guarantor.name || '');
                form.setValue('guarantorDocumentId', revisionData.guarantor.documentId || '');
                form.setValue('guarantorPhone', revisionData.guarantor.phone || '');
                form.setValue('guarantorEmail', revisionData.guarantor.email || '');
                form.setValue('guarantorRelationship', revisionData.guarantor.relationship || '');
              }
              
              if (revisionData.preferences) {
                form.setValue('preferredApartmentType', revisionData.preferences.apartmentType || '');
                form.setValue('moveInDate', revisionData.preferences.moveInDate || '');
                form.setValue('additionalNotes', revisionData.preferences.additionalNotes || '');
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading revision:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar la solicitud. Por favor recarga la página.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingRevision(false);
      }
    };

    initializeRevision();
  }, [userId, userEmail, userName, form, toast]);

  // Crear revisión solo cuando el usuario inicia el proceso (Continuar en paso 0 o subir documento)
  const ensureRevisionExists = async (): Promise<string | null> => {
    if (!isFirebaseConfigured || !database) return null;
    if (revisionIdRef.current) return revisionIdRef.current;

    const now = new Date().toISOString();
    const formData = form.getValues();
    const revisionRef = push(ref(database, "revisions"));
    const newRevisionId = revisionRef.key;
    if (!newRevisionId) return null;

    const initialRevisionData = {
      revisionId: newRevisionId,
      userId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      selectedApartmentId: formData.selectedApartmentId || "",
      personalInfo: {
        fullName: formData.fullName || userName || "",
        email: formData.email || userEmail,
        documentId: formData.documentId || "",
        phone: formData.phone || "",
      },
      employmentInfo: {
        occupation: "",
        monthlyIncome: "",
        employmentLetter: null,
      },
      financialInfo: {
        bankName: "",
        accountType: "",
      },
      guarantor: {
        name: "",
        documentId: "",
        phone: "",
        email: "",
        relationship: "",
        verified: false,
      },
      preferences: {
        apartmentType: null,
        moveInDate: null,
        additionalNotes: null,
      },
      documents: {
        idCard: { uploaded: false, verified: false },
        payStubs: { uploaded: false, verified: false },
        bankStatements: { uploaded: false, verified: false },
        guarantorIdCard: { uploaded: false, verified: false },
      },
      metadata: {
        source: "web_app",
        userAgent: navigator.userAgent,
      },
    };

    await set(revisionRef, initialRevisionData);
    await set(ref(database, `users/${userId}/waitlistApplication`), {
      revisionId: newRevisionId,
      status: "pending",
      appliedAt: now,
    });
    setRevisionId(newRevisionId);
    revisionIdRef.current = newRevisionId;
    return newRevisionId;
  };

  const steps = [
    {
      id: "personal",
      title: "Datos personales",
      description: "Tu información básica nos ayuda a conocerte mejor",
      icon: User,
      fields: ["fullName", "documentId", "email", "phone"],
    },
    {
      id: "employment",
      title: "Información laboral",
      description: "Estos datos son confidenciales y protegidos",
      icon: Building2,
      fields: ["occupation", "monthlyIncome", "employmentLetter"],
    },
    {
      id: "financial",
      title: "Referencias bancarias",
      description: "Información para validar tu historial financiero",
      icon: CreditCard,
      fields: ["bankName", "accountType"],
    },
    {
      id: "guarantor",
      title: "Deudor solidario",
      description: "Una persona de confianza que respalde tu solicitud",
      icon: UserCheck,
      fields: ["guarantorName", "guarantorDocumentId", "guarantorPhone", "guarantorEmail", "guarantorRelationship"],
    },
    {
      id: "preferences",
      title: "Preferencias",
      description: "Ayúdanos a encontrar el espacio perfecto para ti",
      icon: Heart,
      fields: ["preferredApartmentType", "moveInDate", "additionalNotes"],
    },
  ];

  const currentStepData = steps[currentStep];

  const onSubmit = async (data: WaitlistFormData) => {
    if (!isFirebaseConfigured || !database || !revisionIdRef.current) {
      toast({
        title: "Error de configuración",
        description: "El sistema no está disponible en este momento.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const now = new Date().toISOString();
      
      // Actualizar la revisión existente con todos los datos finales
      const revisionRef = ref(database, `revisions/${revisionIdRef.current}`);
      
      const revisionData = {
        updatedAt: now,
        status: "pending",
        
        // Apartamento seleccionado
        selectedApartmentId: data.selectedApartmentId,
        
        // Datos personales
        personalInfo: {
          fullName: data.fullName,
          documentId: data.documentId,
          email: data.email,
          phone: data.phone,
        },
        
        // Información laboral
        employmentInfo: {
          occupation: data.occupation,
          monthlyIncome: data.monthlyIncome,
          employmentLetter: data.employmentLetter || null,
        },
        
        // Referencias bancarias
        financialInfo: {
          bankName: data.bankName,
          accountType: data.accountType,
        },
        
        // Deudor solidario
        guarantor: {
          name: data.guarantorName,
          documentId: data.guarantorDocumentId,
          phone: data.guarantorPhone,
          email: data.guarantorEmail,
          relationship: data.guarantorRelationship,
          verified: false,
        },
        
        // Preferencias
        preferences: {
          apartmentType: data.preferredApartmentType || null,
          moveInDate: data.moveInDate || null,
          additionalNotes: data.additionalNotes || null,
        },
      };
      
      await update(revisionRef, revisionData);
      
      toast({
        title: "¡Solicitud enviada con éxito!",
        description: "Pronto nos pondremos en contacto contigo. Tu futuro hogar te espera.",
      });
      
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting waitlist form:", error);
      toast({
        title: "Error al enviar",
        description: "Por favor intenta de nuevo. Estamos aquí para ayudarte.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guardar datos del paso actual en Firebase
  const saveCurrentStepData = async () => {
    if (!isFirebaseConfigured || !database || !revisionIdRef.current) {
      return;
    }

    setIsSaving(true);
    try {
      const formData = form.getValues();
      const now = new Date().toISOString();
      const revisionRef = ref(database, `revisions/${revisionIdRef.current}`);
      
      const updateData: any = {
        updatedAt: now,
      };

      // Actualizar según el paso actual
      switch (currentStep) {
        case 0: // Datos personales
          updateData.selectedApartmentId = formData.selectedApartmentId;
          updateData.personalInfo = {
            fullName: formData.fullName,
            documentId: formData.documentId,
            email: formData.email,
            phone: formData.phone,
          };
          break;
        case 1: // Información laboral
          updateData.employmentInfo = {
            occupation: formData.occupation,
            monthlyIncome: formData.monthlyIncome,
            employmentLetter: formData.employmentLetter || null,
          };
          break;
        case 2: // Referencias bancarias
          updateData.financialInfo = {
            bankName: formData.bankName,
            accountType: formData.accountType,
          };
          break;
        case 3: // Deudor solidario
          updateData.guarantor = {
            name: formData.guarantorName,
            documentId: formData.guarantorDocumentId,
            phone: formData.guarantorPhone,
            email: formData.guarantorEmail,
            relationship: formData.guarantorRelationship,
            verified: false,
          };
          break;
        case 4: // Preferencias
          updateData.preferences = {
            apartmentType: formData.preferredApartmentType || null,
            moveInDate: formData.moveInDate || null,
            additionalNotes: formData.additionalNotes || null,
          };
          break;
      }

      await update(revisionRef, updateData);
    } catch (error) {
      console.error("Error saving step data:", error);
      // No mostrar error al usuario para no interrumpir el flujo
    } finally {
      setIsSaving(false);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof WaitlistFormData)[] = currentStepData.fields as (keyof WaitlistFormData)[];

    if (currentStep === 0) {
      fieldsToValidate = ["selectedApartmentId", "email", "phone"] as (keyof WaitlistFormData)[];
    }

    const isValid = await form.trigger(fieldsToValidate);

    if (isValid && currentStep < steps.length - 1) {
      // Crear revisión al pasar del paso 0 al 1 si aún no existe
      if (currentStep === 0 && !revisionIdRef.current) {
        const revId = await ensureRevisionExists();
        if (!revId) {
          toast({
            title: "Error",
            description: "No se pudo iniciar la solicitud. Intenta de nuevo.",
            variant: "destructive",
          });
          return;
        }
      }
      await saveCurrentStepData();
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = async () => {
    if (currentStep > 0) {
      // Guardar datos antes de retroceder
      await saveCurrentStepData();
      setCurrentStep(currentStep - 1);
    }
  };

  // Monitorear el procesamiento del documento de identidad para extraer datos automáticamente
  useEffect(() => {
    if (!database || !idCardFileId) return;

    const fileRef = ref(database, `files/${idCardFileId}`);
    
    const unsubscribe = onValue(fileRef, (snapshot) => {
      if (snapshot.exists()) {
        const fileData = snapshot.val();
        
        // Si el documento tiene datos extraídos y es el documento de identidad
        if (fileData.document_extracted_data && fileData.documentType === 'idCard') {
          setIdCardDataExtracted(true);
          const extractedData = fileData.document_extracted_data;
          
          // Extraer nombre completo
          if (extractedData.fullName?.value || extractedData.name?.value) {
            const fullName = extractedData.fullName?.value || extractedData.name?.value;
            form.setValue('fullName', fullName);
            
            // Guardar automáticamente en la revisión
            if (revisionIdRef.current) {
              const revisionRef = ref(database, `revisions/${revisionIdRef.current}/personalInfo`);
              update(revisionRef, { fullName });
            }
          }
          
          // Extraer número de documento/cedula
          if (extractedData.documentId?.value || extractedData.nit?.value || extractedData.cedula?.value) {
            const documentId = extractedData.documentId?.value || extractedData.nit?.value || extractedData.cedula?.value;
            // Limpiar formato (remover espacios, guiones)
            const cleanDocumentId = documentId.replace(/[\s\-]/g, '');
            form.setValue('documentId', cleanDocumentId);
            
            // Guardar automáticamente en la revisión
            if (revisionIdRef.current) {
              const revisionRef = ref(database, `revisions/${revisionIdRef.current}/personalInfo`);
              update(revisionRef, { documentId: cleanDocumentId });
            }
          }
          
          if (extractedData.fullName?.value || extractedData.documentId?.value) {
            setIsExtractingData(false);
            toast({
              title: "Datos extraídos automáticamente",
              description: "El nombre y número de documento se han extraído del documento subido.",
            });
          }
        }
        
        // Mostrar "Extrayendo datos..." mientras la API procesa (statusAi pending)
        if (fileData.statusAi === 'pending' && fileData.documentType === 'idCard') {
          setIsExtractingData(true);
        }
      }
    });

    return () => {
      off(fileRef);
    };
  }, [idCardFileId, database, form, toast]);

  // Manejar subida exitosa de documentos
  const handleDocumentUploadSuccess = async (documentType: DocumentType, fileUrl: string, fileId: string) => {
    if (!database) return;

    try {
      // Crear revisión si aún no existe (p. ej. usuario sube documento antes de pulsar Continuar)
      if (!revisionIdRef.current) {
        const revId = await ensureRevisionExists();
        if (!revId) {
          toast({
            title: "Error",
            description: "No se pudo guardar el documento. Intenta de nuevo.",
            variant: "destructive",
          });
          return;
        }
      }

      const documentRef = ref(
        database,
        `revisions/${revisionIdRef.current}/documents/${documentType}`
      );
      
      await set(documentRef, {
        uploaded: true,
        verified: false,
        fileId: fileId,
        fileUrl: fileUrl,
        uploadedAt: serverTimestamp(),
      });

      // Si es el documento de identidad, guardar el fileId para monitorear el procesamiento
      if (documentType === 'idCard') {
        setIdCardFileId(fileId);
        setIsExtractingData(true);
        
        toast({
          title: "Documento subido",
          description: "El documento se ha subido correctamente. Extrayendo datos automáticamente...",
        });
      } else {
        toast({
          title: "Documento subido",
          description: "El documento se ha subido correctamente.",
        });
      }
    } catch (error) {
      console.error("Error updating document status:", error);
      toast({
        title: "Error",
        description: "El documento se subió pero no se pudo actualizar el estado.",
        variant: "destructive",
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            {/* Selector de apartamento */}
            <FormField
              control={form.control}
              name="selectedApartmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-primary" />
                    Espacio de interés
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={apartmentsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el espacio al que deseas aplicar" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableApartments.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground text-center">
                            {apartmentsLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                                Cargando espacios...
                              </>
                            ) : (
                              "No hay espacios disponibles en este momento"
                            )}
                          </div>
                        ) : (
                          availableApartments.map((apt) => (
                            <SelectItem key={apt.apartmentId} value={apt.apartmentId}>
                              {apt.name} - {apt.concept}
                              {apt.price && ` - $${typeof apt.price === 'number' ? apt.price.toLocaleString() : apt.price}/mes`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription className="text-xs">
                    Selecciona el espacio al que deseas aplicar para la solicitud
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Información del apartamento seleccionado */}
            {form.watch('selectedApartmentId') && (
              <div className="glass-panel p-4 border-primary/20 bg-primary/5">
                {(() => {
                  const selectedApt = availableApartments.find(
                    apt => apt.apartmentId === form.watch('selectedApartmentId')
                  );
                  if (!selectedApt) return null;
                  
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">{selectedApt.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{selectedApt.concept}</p>
                      {selectedApt.description && (
                        <p className="text-xs text-muted-foreground mt-2">{selectedApt.description}</p>
                      )}
                      {selectedApt.price && (
                        <p className="text-xs font-medium mt-2">
                          Precio: ${typeof selectedApt.price === 'number' 
                            ? selectedApt.price.toLocaleString() 
                            : selectedApt.price}/mes
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <Separator className="my-4" />

            {/* Indicador de extracción de datos */}
            {isExtractingData && (
              <div className="glass-panel p-3 border-primary/30 bg-primary/5 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Extrayendo datos del documento de identidad...
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Nombre completo
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Se extraerá automáticamente del documento" 
                      {...field}
                      readOnly={idCardDataExtracted}
                      className={idCardDataExtracted ? "bg-muted cursor-not-allowed" : ""}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    {idCardDataExtracted 
                      ? "✓ Este campo se llenó automáticamente desde tu documento"
                      : "Sube tu documento de identidad para autocompletar este campo"
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="documentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Número de cédula
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Se extraerá automáticamente del documento" 
                      {...field}
                      readOnly={idCardDataExtracted}
                      className={idCardDataExtracted ? "bg-muted cursor-not-allowed" : ""}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    {idCardDataExtracted 
                      ? "✓ Este campo se llenó automáticamente desde tu documento"
                      : "Tu información está protegida con los más altos estándares de seguridad"
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    Correo electrónico
                  </FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="tu@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    Teléfono de contacto
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: 3001234567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subida de cédula de identidad */}
            <Separator className="my-4" />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4 text-primary" />
                Documento de identidad
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Sube tu cédula de identidad (ambas caras en un solo PDF). El nombre y número de documento se extraerán automáticamente.
              </p>
              <DocumentUploader
                documentType="idCard"
                userId={userId}
                revisionId={revisionIdRef.current || undefined}
                autoUpload
                onUploadSuccess={(fileUrl, fileId) => 
                  handleDocumentUploadSuccess('idCard', fileUrl, fileId)
                }
                onUploadError={(error) => {
                  toast({
                    title: "Error al subir documento",
                    description: error,
                    variant: "destructive",
                  });
                }}
              />
            </div>
          </div>
        );
        
      case 1:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ocupación / Profesión</FormLabel>
                  <FormControl>
                    <Input placeholder="¿A qué te dedicas?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="monthlyIncome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ingresos mensuales aproximados</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: $3,000,000" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Esta información es confidencial y solo se usa para el estudio
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="employmentLetter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Carta laboral (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Puedes pegar el texto de tu carta laboral o indicar que la adjuntarás posteriormente"
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    También puedes subir el documento en PDF
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subida de desprendibles de pago */}
            <Separator className="my-4" />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4 text-primary" />
                Desprendibles de pago (últimos 3 meses)
              </div>
              <DocumentUploader
                documentType="payStubs"
                userId={userId}
                revisionId={revisionIdRef.current || undefined}
                onUploadSuccess={(fileUrl, fileId) => 
                  handleDocumentUploadSuccess('payStubs', fileUrl, fileId)
                }
                onUploadError={(error) => {
                  toast({
                    title: "Error al subir documento",
                    description: error,
                    variant: "destructive",
                  });
                }}
              />
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-4">
            <div className="glass-panel p-4 border-primary/20 bg-primary/5 mb-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Tus datos financieros están protegidos</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Utilizamos encriptación de grado bancario para proteger tu información
                  </p>
                </div>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entidad bancaria principal</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Bancolombia, Davivienda..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de cuenta</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Ahorros, Corriente" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    También puedes subir los extractos bancarios ahora
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subida de extractos bancarios */}
            <Separator className="my-4" />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4 text-primary" />
                Extractos bancarios (últimos 3 meses)
              </div>
              <DocumentUploader
                documentType="bankStatements"
                userId={userId}
                revisionId={revisionIdRef.current || undefined}
                onUploadSuccess={(fileUrl, fileId) => 
                  handleDocumentUploadSuccess('bankStatements', fileUrl, fileId)
                }
                onUploadError={(error) => {
                  toast({
                    title: "Error al subir documento",
                    description: error,
                    variant: "destructive",
                  });
                }}
              />
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-4">
            <div className="glass-panel p-4 border-accent/20 bg-accent/5 mb-4">
              <div className="flex items-start gap-3">
                <UserCheck className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Deudor solidario</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Una persona de confianza que respalde tu solicitud. Será contactada para verificación.
                  </p>
                </div>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="guarantorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo del deudor solidario</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="guarantorDocumentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de cédula</FormLabel>
                  <FormControl>
                    <Input placeholder="Cédula del deudor solidario" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="guarantorPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="Teléfono de contacto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="guarantorEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Correo del deudor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="guarantorRelationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relación con el deudor solidario</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Familiar, Amigo, Colega..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subida de cédula del codeudor */}
            <Separator className="my-4" />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4 text-primary" />
                Cédula del deudor solidario
              </div>
              <DocumentUploader
                documentType="guarantorIdCard"
                userId={userId}
                revisionId={revisionIdRef.current || undefined}
                onUploadSuccess={(fileUrl, fileId) => 
                  handleDocumentUploadSuccess('guarantorIdCard', fileUrl, fileId)
                }
                onUploadError={(error) => {
                  toast({
                    title: "Error al subir documento",
                    description: error,
                    variant: "destructive",
                  });
                }}
              />
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="preferredApartmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de espacio preferido</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Estudio, 1 habitación, 2 habitaciones..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="moveInDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha aproximada de mudanza</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="additionalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Hay algo más que debamos saber?</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Cuéntanos sobre tus necesidades especiales, mascotas, o cualquier información relevante..."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Resumen de documentos */}
            <div className="glass-panel p-4 border-primary/20 mt-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Documentos adjuntados
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Los documentos se pueden subir en cada paso correspondiente. Puedes volver atrás para subirlos si aún no lo has hecho.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Cédula de ciudadanía (Paso 1)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Desprendibles de pago (Paso 2)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Extractos bancarios (Paso 3)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Cédula del deudor solidario (Paso 4)
                </li>
              </ul>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-panel border-primary/20 overflow-hidden">
        {/* Header con mensaje de bienvenida neurolingüístico */}
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Tu nuevo hogar te espera</CardTitle>
              <CardDescription>
                Únete a nuestra lista de espera y da el primer paso hacia tu espacio ideal
              </CardDescription>
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                    index < currentStep 
                      ? "bg-primary text-primary-foreground" 
                      : index === currentStep 
                        ? "bg-primary/20 text-primary border-2 border-primary" 
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${
                    index < currentStep ? "bg-primary" : "bg-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {isLoadingRevision ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Step header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <currentStepData.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{currentStepData.title}</h3>
                  <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
                </div>
              </div>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  {renderStepContent()}
                  
                  <Separator className="my-6" />
                  
                  {/* Navigation buttons */}
                  <div className="flex items-center justify-between">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={prevStep}
                      disabled={currentStep === 0 || isSaving}
                    >
                      Anterior
                    </Button>
                    
                    {currentStep < steps.length - 1 ? (
                      <Button 
                        type="button" 
                        onClick={nextStep} 
                        className="gap-2"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            Continuar
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button type="submit" disabled={isSubmitting} className="gap-2">
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Enviar solicitud
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Trust indicators */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 grid grid-cols-3 gap-4 text-center"
      >
        <div className="glass-panel p-3">
          <Shield className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-xs text-muted-foreground">Datos encriptados</p>
        </div>
        <div className="glass-panel p-3">
          <Clock className="w-5 h-5 mx-auto mb-1 text-accent" />
          <p className="text-xs text-muted-foreground">Respuesta en 48h</p>
        </div>
        <div className="glass-panel p-3">
          <Heart className="w-5 h-5 mx-auto mb-1 text-warmth" />
          <p className="text-xs text-muted-foreground">+500 familias felices</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

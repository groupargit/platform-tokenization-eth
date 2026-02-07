/**
 * Document Uploader Component
 * 
 * Componente reutilizable para subir documentos PDF con validaciones
 * y retroalimentación visual del progreso.
 * 
 * Requisitos:
 * - Solo acepta archivos PDF
 * - Tamaño máximo: 5 MB
 * - Muestra progreso de subida
 * - Validaciones en tiempo real
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useFileUpload } from '@/hooks/useFileUpload';
import type { DocumentType, UploadOptions } from '@/services/fileUploadService';

export interface DocumentUploaderProps {
  documentType: DocumentType;
  userId: string;
  revisionId?: string;
  onUploadSuccess?: (fileUrl: string, fileId: string) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  label?: string;
  /** Si true, al seleccionar/arrastrar un archivo se sube automáticamente (sin pulsar "Subir archivo") y se dispara el procesamiento. */
  autoUpload?: boolean;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024; // 5 MB

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  bankStatements: 'Estados de cuenta bancarios',
  guarantorIdCard: 'Cédula del codeudor',
  idCard: 'Cédula de identidad',
  payStubs: 'Desprendibles de pago'
};

export function DocumentUploader({
  documentType,
  userId,
  revisionId,
  onUploadSuccess,
  onUploadError,
  className,
  disabled = false,
  label,
  autoUpload = false,
}: DocumentUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadFile, isUploading, uploadProgress, error, reset } = useFileUpload();

  // Validar archivo antes de subir
  const validateFile = useCallback((file: File): string | null => {
    // Validar tipo MIME
    if (file.type !== 'application/pdf') {
      return 'Solo se permiten archivos PDF';
    }

    // Validar extensión
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return 'El archivo debe tener extensión .pdf';
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE_MB} MB. Tamaño actual: ${fileSizeMB} MB`;
    }

    // Validar que no esté vacío
    if (file.size === 0) {
      return 'El archivo está vacío';
    }

    return null;
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      return;
    }

    // Resetear errores previos
    setValidationError(null);
    reset();

    // Validar archivo
    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }, [validateFile, reset]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      return;
    }

    const options: UploadOptions = {
      userId,
      documentType,
      ...(revisionId && { revisionId })
    };

    const result = await uploadFile(selectedFile, options);

    if (result.success && result.fileUrl && result.fileId) {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      if (onUploadSuccess) {
        onUploadSuccess(result.fileUrl, result.fileId);
      }
    } else if (result.error) {
      if (onUploadError) {
        onUploadError(result.error);
      }
    }
  }, [selectedFile, userId, documentType, revisionId, uploadFile, onUploadSuccess, onUploadError]);

  const autoUploadStartedRef = useRef<File | null>(null);
  // Subida automática al seleccionar/arrastrar cuando autoUpload está activo (ej. documento de identidad para procesar y autocompletar)
  useEffect(() => {
    if (!autoUpload || !selectedFile || isUploading) return;
    if (autoUploadStartedRef.current === selectedFile) return;
    autoUploadStartedRef.current = selectedFile;
    const options: UploadOptions = {
      userId,
      documentType,
      ...(revisionId && { revisionId }),
    };
    let cancelled = false;
    uploadFile(selectedFile, options).then((result) => {
      autoUploadStartedRef.current = null;
      if (cancelled) return;
      if (result.success && result.fileUrl && result.fileId) {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onUploadSuccess?.(result.fileUrl, result.fileId);
      } else if (result.error && onUploadError) {
        onUploadError(result.error);
      }
    });
    return () => { cancelled = true; };
  }, [autoUpload, selectedFile, isUploading, userId, documentType, revisionId, uploadFile, onUploadSuccess, onUploadError]);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setValidationError(null);
    reset();
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [reset]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || isUploading) {
      return;
    }

    const file = e.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    setValidationError(null);
    reset();

    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      return;
    }

    setSelectedFile(file);
  }, [disabled, isUploading, validateFile, reset]);

  const displayLabel = label || DOCUMENT_LABELS[documentType];
  const hasError = !!validationError || !!error;
  const fileSizeMB = selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) : '0';

  return (
    <div className={cn('space-y-3', className)}>
      <label className="text-sm font-medium">{displayLabel}</label>
      
      {/* Área de carga de archivos */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors',
          'hover:border-primary/50',
          hasError && 'border-destructive',
          isUploading && 'border-primary',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
          id={`file-upload-${documentType}`}
        />

        {!selectedFile ? (
          <label
            htmlFor={`file-upload-${documentType}`}
            className={cn(
              'flex flex-col items-center justify-center cursor-pointer',
              (disabled || isUploading) && 'cursor-not-allowed'
            )}
          >
            <Upload className="w-10 h-10 text-muted-foreground mb-2" />
            <p className="text-sm font-medium mb-1">
              Haz clic para seleccionar o arrastra un archivo PDF
            </p>
            <p className="text-xs text-muted-foreground">
              Tamaño máximo: {MAX_FILE_SIZE_MB} MB
            </p>
          </label>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <FileText className="w-8 h-8 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {fileSizeMB} MB
                </p>
              </div>
            </div>
            
            {!isUploading && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                disabled={disabled}
                className="shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Indicador de progreso */}
        {isUploading && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Subiendo archivo...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
      </div>

      {/* Botón de subir (oculto si autoUpload: la subida se inicia al seleccionar) */}
      {selectedFile && !isUploading && !autoUpload && (
        <Button
          onClick={handleUpload}
          disabled={disabled || hasError}
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          Subir archivo
        </Button>
      )}

      {/* Indicador de carga */}
      {isUploading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Subiendo archivo...</span>
        </div>
      )}

      {/* Mensajes de error */}
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Mensaje de éxito */}
      {!isUploading && !selectedFile && uploadProgress === 100 && !error && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700">
            Archivo subido exitosamente
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

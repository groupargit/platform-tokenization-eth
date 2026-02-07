import { useState, useCallback } from 'react';
import { 
  uploadPDFToGCP, 
  FileUploadResult, 
  DocumentType,
  UploadOptions 
} from '@/services/fileUploadService';

interface UseFileUploadReturn {
  uploadFile: (file: File, options: UploadOptions) => Promise<FileUploadResult>;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  reset: () => void;
}

export function useFileUpload(): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (
    file: File,
    options: UploadOptions
  ): Promise<FileUploadResult> => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const result = await uploadPDFToGCP(
        file,
        options,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      if (!result.success && result.error) {
        setError(result.error);
      } else {
        setUploadProgress(100);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Error desconocido al subir el archivo';
      
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(0);
    setError(null);
  }, []);

  return {
    uploadFile,
    isUploading,
    uploadProgress,
    error,
    reset
  };
}

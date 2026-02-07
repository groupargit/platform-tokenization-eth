import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  StorageError,
  UploadTaskSnapshot
} from 'firebase/storage';
import app, { isFirebaseConfigured } from '@/lib/firebase';
import { database } from '@/lib/firebase';
import { ref as dbRef, set, push, serverTimestamp, update } from 'firebase/database';
import { processIdDocument } from '@/services/documentProcessingService';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['application/pdf'];
const ALLOWED_FILE_EXTENSIONS = ['.pdf'];
const MAX_FILENAME_LENGTH = 255;

export type DocumentType = 
  | 'bankStatements' 
  | 'guarantorIdCard' 
  | 'idCard' 
  | 'payStubs';

export interface FileUploadResult {
  success: boolean;
  fileId?: string;
  fileUrl?: string;
  error?: string;
  fileMetadata?: FileMetadata;
}

export interface FileMetadata {
  _id: string;
  name: string;
  originalName: string;
  user: string;
  createdAt: string;
  bucket: string;
  revisionId?: string;
  documentType?: DocumentType;
  status?: 'pending' | 'ok' | 'error';
  statusAi?: 'pending' | 'validated' | 'error';
  __v?: number;
}

export interface UploadOptions {
  userId: string;
  revisionId?: string;
  documentType: DocumentType;
  folderPath?: string;
}

function validatePDFFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No se proporcionó ningún archivo' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Solo se permiten archivos PDF. Tipo de archivo detectado: ' + file.type 
    };
  }

  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_FILE_EXTENSIONS.some(ext => 
    fileName.endsWith(ext)
  );
  
  if (!hasValidExtension) {
    return { 
      valid: false, 
      error: 'Solo se permiten archivos PDF (.pdf)' 
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return { 
      valid: false, 
      error: `El archivo excede el tamaño máximo permitido de ${maxSizeMB} MB. Tamaño del archivo: ${fileSizeMB} MB` 
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'El archivo está vacío' };
  }

  if (file.name.length > MAX_FILENAME_LENGTH) {
    return { 
      valid: false, 
      error: `El nombre del archivo es demasiado largo (máximo ${MAX_FILENAME_LENGTH} caracteres)` 
    };
  }

  return { valid: true };
}

function sanitizeFileName(fileName: string): string {
  let sanitized = fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');

  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    const name = sanitized.substring(0, MAX_FILENAME_LENGTH - ext.length);
    sanitized = name + ext;
  }

  if (!sanitized.toLowerCase().endsWith('.pdf')) {
    sanitized += '.pdf';
  }

  return sanitized;
}

function generateUniqueFileName(
  userId: string, 
  originalName: string, 
  documentType: DocumentType,
  revisionId?: string
): string {
  const timestamp = Date.now();
  const sanitizedOriginal = sanitizeFileName(originalName);
  const baseName = sanitizedOriginal.replace(/\.pdf$/i, '');
  
  const folder = revisionId 
    ? `production/${userId}/${revisionId}` 
    : `production/${userId}`;
  
  return `${folder}/${timestamp}_${documentType}_${baseName}.pdf`;
}

export async function uploadPDFToGCP(
  file: File,
  options: UploadOptions,
  onProgress?: (progress: number) => void
): Promise<FileUploadResult> {
  if (!isFirebaseConfigured) {
    return {
      success: false,
      error: 'Firebase no está configurado. Verifica las variables de entorno.'
    };
  }

  if (!app) {
    return {
      success: false,
      error: 'Firebase no está inicializado correctamente.'
    };
  }

  const validation = validatePDFFile(file);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Validación de archivo fallida'
    };
  }

  try {
    const storage = getStorage(app);
    
    const fileName = generateUniqueFileName(
      options.userId,
      file.name,
      options.documentType,
      options.revisionId
    );

    const storageRef = ref(storage, fileName);

    const metadata = {
      contentType: 'application/pdf',
      customMetadata: {
        userId: options.userId,
        documentType: options.documentType,
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        ...(options.revisionId && { revisionId: options.revisionId })
      }
    };

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    const snapshot = await new Promise<UploadTaskSnapshot>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error: StorageError) => {
          reject(error);
        },
        () => {
          resolve(uploadTask.snapshot);
        }
      );
    });

    const downloadURL = await getDownloadURL(snapshot.ref);

    const fileId = push(dbRef(database, 'files')).key;
    if (!fileId) {
      throw new Error('No se pudo generar un ID único para el archivo');
    }

    const fileMetadata: FileMetadata = {
      _id: fileId,
      name: getDocumentName(options.documentType),
      originalName: file.name,
      user: options.userId,
      createdAt: new Date().toISOString(),
      bucket: downloadURL,
      revisionId: options.revisionId,
      documentType: options.documentType,
      status: 'ok',
      statusAi: 'pending',
      __v: 0
    };

    const fileDbRef = dbRef(database, `files/${fileId}`);
    await set(fileDbRef, fileMetadata);

    if (options.revisionId && database) {
      const revisionDocRef = dbRef(
        database,
        `revisions/${options.revisionId}/documents/${options.documentType}`
      );

      await set(revisionDocRef, {
        uploaded: true,
        verified: false,
        fileId: fileId,
        uploadedAt: serverTimestamp(),
        fileUrl: downloadURL
      });
    }

    if (options.documentType === 'idCard') {
      void processAndUpdateExtractedData(
        downloadURL,
        fileId,
        options.revisionId
      );
    }

    return {
      success: true,
      fileId,
      fileUrl: downloadURL,
      fileMetadata
    };

  } catch (error) {
    console.error('Error al subir archivo:', error);
    
    let errorMessage = 'Error desconocido al subir el archivo';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'code' in error) {
      const storageError = error as StorageError;
      switch (storageError.code) {
        case 'storage/unauthorized':
          errorMessage = 'No tienes permisos para subir archivos';
          break;
        case 'storage/canceled':
          errorMessage = 'La subida fue cancelada';
          break;
        case 'storage/unknown':
          errorMessage = 'Error desconocido de almacenamiento';
          break;
        default:
          errorMessage = `Error de almacenamiento: ${storageError.code}`;
      }
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

async function processAndUpdateExtractedData(
  fileUrl: string,
  fileId: string,
  revisionId?: string
): Promise<void> {
  if (!database) return;
  try {
    const extracted = await processIdDocument(fileUrl, fileId, revisionId);
    if (!extracted) return;

    const fileDbRef = dbRef(database, `files/${fileId}`);
    const document_extracted_data: Record<string, { value: string }> = {};
    if (extracted.fullName) {
      document_extracted_data.fullName = { value: extracted.fullName };
    }
    if (extracted.documentId) {
      document_extracted_data.documentId = { value: extracted.documentId };
    }

    await update(fileDbRef, {
      document_extracted_data,
      statusAi: 'validated',
      aiProcessed: true,
    });
  } catch (err) {
    console.warn('[fileUpload] Error processing id document:', err);
    const fileDbRef = dbRef(database, `files/${fileId}`);
    await update(fileDbRef, { statusAi: 'error' }).catch(() => {});
  }
}

function getDocumentName(documentType: DocumentType): string {
  const names: Record<DocumentType, string> = {
    bankStatements: 'Estados de cuenta bancarios',
    guarantorIdCard: 'Cédula del codeudor',
    idCard: 'Cédula de identidad',
    payStubs: 'Desprendibles de pago'
  };
  
  return names[documentType] || documentType;
}

export async function deleteFile(
  fileId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseConfigured || !app || !database) {
    return {
      success: false,
      error: 'Firebase no está configurado correctamente'
    };
  }

  try {
    const fileDbRef = dbRef(database, `files/${fileId}`);
    await set(fileDbRef, null);

    return { success: true };
  } catch (error) {
    console.error('Error al eliminar archivo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

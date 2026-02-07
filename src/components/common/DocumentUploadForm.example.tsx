/**
 * Ejemplo de uso del componente DocumentUploader
 * 
 * Este componente muestra cómo integrar el DocumentUploader en un formulario
 * de revisión de documentos, similar a la revisión "-OjS4U-YK129FZ4N8obQ"
 * 
 * USO:
 * Este es un archivo de ejemplo. Para usarlo, cópialo y adapta según tus necesidades.
 */

import { useState } from 'react';
import { DocumentUploader } from './DocumentUploader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { DocumentType } from '@/services/fileUploadService';

interface DocumentUploadFormProps {
  userId: string;
  revisionId: string;
}

/**
 * Componente de formulario para subir documentos de una revisión
 */
export function DocumentUploadForm({ userId, revisionId }: DocumentUploadFormProps) {
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<Record<DocumentType, string | null>>({
    bankStatements: null,
    guarantorIdCard: null,
    idCard: null,
    payStubs: null,
  });

  const handleUploadSuccess = (documentType: DocumentType, fileUrl: string, fileId: string) => {
    setUploadedFiles(prev => ({
      ...prev,
      [documentType]: fileUrl
    }));

    toast({
      title: 'Archivo subido exitosamente',
      description: `El ${getDocumentLabel(documentType)} ha sido subido correctamente.`,
    });

    // Aquí puedes actualizar el estado de la revisión en Firebase si es necesario
    // Por ejemplo, marcar el documento como subido
    console.log('File uploaded:', { documentType, fileUrl, fileId });
  };

  const handleUploadError = (documentType: DocumentType, error: string) => {
    toast({
      variant: 'destructive',
      title: 'Error al subir archivo',
      description: `Error al subir el ${getDocumentLabel(documentType)}: ${error}`,
    });
  };

  const getDocumentLabel = (type: DocumentType): string => {
    const labels: Record<DocumentType, string> = {
      bankStatements: 'estado de cuenta',
      guarantorIdCard: 'cédula del codeudor',
      idCard: 'cédula de identidad',
      payStubs: 'desprendible de pago',
    };
    return labels[type];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subir Documentos</CardTitle>
        <CardDescription>
          Sube los documentos requeridos en formato PDF (máximo 5 MB por archivo)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cédula de Identidad */}
        <DocumentUploader
          documentType="idCard"
          userId={userId}
          revisionId={revisionId}
          onUploadSuccess={(url, fileId) => handleUploadSuccess('idCard', url, fileId)}
          onUploadError={(error) => handleUploadError('idCard', error)}
        />

        {/* Estados de Cuenta Bancarios */}
        <DocumentUploader
          documentType="bankStatements"
          userId={userId}
          revisionId={revisionId}
          onUploadSuccess={(url, fileId) => handleUploadSuccess('bankStatements', url, fileId)}
          onUploadError={(error) => handleUploadError('bankStatements', error)}
        />

        {/* Desprendibles de Pago */}
        <DocumentUploader
          documentType="payStubs"
          userId={userId}
          revisionId={revisionId}
          onUploadSuccess={(url, fileId) => handleUploadSuccess('payStubs', url, fileId)}
          onUploadError={(error) => handleUploadError('payStubs', error)}
        />

        {/* Cédula del Codeudor */}
        <DocumentUploader
          documentType="guarantorIdCard"
          userId={userId}
          revisionId={revisionId}
          onUploadSuccess={(url, fileId) => handleUploadSuccess('guarantorIdCard', url, fileId)}
          onUploadError={(error) => handleUploadError('guarantorIdCard', error)}
        />

        {/* Resumen de archivos subidos */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-medium mb-2">Estado de documentos</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(uploadedFiles).map(([type, url]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-muted-foreground">{getDocumentLabel(type as DocumentType)}</span>
                <span className={url ? 'text-green-600' : 'text-muted-foreground'}>
                  {url ? '✓ Subido' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Ejemplo de uso en un componente de página
 * 
 * ```tsx
 * import { DocumentUploadForm } from '@/components/common/DocumentUploadForm.example';
 * 
 * export function RevisionPage() {
 *   const { user } = useAuth0();
 *   const userId = user?.email || '';
 *   const revisionId = '-OjS4U-YK129FZ4N8obQ';
 * 
 *   return (
 *     <div>
 *       <h1>Revisión de Documentos</h1>
 *       <DocumentUploadForm userId={userId} revisionId={revisionId} />
 *     </div>
 *   );
 * }
 * ```
 */

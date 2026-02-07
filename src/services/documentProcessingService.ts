const DOCUMENT_API_HOST =
  import.meta.env.VITE_DOCUMENT_PROCESSING_API_URL ||
  import.meta.env.VITE_HOME_ASSISTANT_HOST;
const DOCUMENT_PROCESSING_PATH =
  import.meta.env.VITE_DOCUMENT_PROCESSING_PATH || "/api/document/process";
const HOME_ASSISTANT_TOKEN = import.meta.env.VITE_HOME_ASSISTANT_TOKEN;

const isDevelopment = import.meta.env.DEV;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;
const USE_EDGE_FUNCTION = !isDevelopment && !!SUPABASE_URL;
const USE_VITE_PROXY = isDevelopment;

export interface ExtractedIdData {
  fullName?: string;
  documentId?: string;
}

export interface DocumentProcessResponse {
  fullName?: string;
  documentId?: string;
  document_extracted_data?: {
    fullName?: { value?: string };
    name?: { value?: string };
    documentId?: { value?: string };
    nit?: { value?: string };
    cedula?: { value?: string };
  };
}

function buildDocumentApiUrl(): string {
  const base = DOCUMENT_API_HOST?.replace(/\/$/, "") || "";
  const path = DOCUMENT_PROCESSING_PATH.startsWith("/")
    ? DOCUMENT_PROCESSING_PATH
    : `/${DOCUMENT_PROCESSING_PATH}`;
  if (USE_EDGE_FUNCTION) {
    return `${SUPABASE_URL}/functions/v1/home-assistant-proxy?path=${encodeURIComponent(
      path
    )}`;
  }
  if (USE_VITE_PROXY) {
    const pathForProxy = path.startsWith("/api") ? path : `/api${path}`;
    return `/api/home-assistant${pathForProxy.replace(/^\/api/, "")}`;
  }
  return `${base}${path}`;
}

export async function processIdDocument(
  fileUrl: string,
  fileId: string,
  revisionId?: string
): Promise<ExtractedIdData | null> {
  if (!DOCUMENT_API_HOST && !USE_VITE_PROXY) {
    console.warn(
      "[documentProcessing] VITE_DOCUMENT_PROCESSING_API_URL o VITE_HOME_ASSISTANT_HOST no configurado"
    );
    return null;
  }

  const url = buildDocumentApiUrl();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (USE_VITE_PROXY) {
    if (HOME_ASSISTANT_TOKEN) {
      headers["Authorization"] = `Bearer ${HOME_ASSISTANT_TOKEN}`;
    }
    headers["ngrok-skip-browser-warning"] = "true";
  } else if (USE_EDGE_FUNCTION && SUPABASE_ANON_KEY) {
    headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
    headers["apikey"] = SUPABASE_ANON_KEY;
  }

  const body = JSON.stringify({
    fileUrl,
    fileId,
    ...(revisionId && { revisionId }),
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      mode: USE_VITE_PROXY ? "same-origin" : "cors",
      signal: AbortSignal.timeout(60000),
    });

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      console.warn("[documentProcessing] API devolvió HTML en lugar de JSON");
      return null;
    }

    if (!response.ok) {
      const errText = await response.text();
      console.warn("[documentProcessing] API error:", response.status, errText);
      return null;
    }

    const data: DocumentProcessResponse = await response.json();

    const fullName =
      data.fullName ??
      data.document_extracted_data?.fullName?.value ??
      data.document_extracted_data?.name?.value;
    const rawDocId =
      data.documentId ??
      data.document_extracted_data?.documentId?.value ??
      data.document_extracted_data?.nit?.value ??
      data.document_extracted_data?.cedula?.value;
    const documentId = rawDocId
      ? String(rawDocId).replace(/[\s\-]/g, "")
      : undefined;

    if (fullName || documentId) {
      return { fullName, documentId };
    }
    return null;
  } catch (error) {
    console.warn("[documentProcessing] Error calling API:", error);
    return null;
  }
}

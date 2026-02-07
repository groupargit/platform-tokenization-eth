const HOME_ASSISTANT_HOST = import.meta.env.VITE_HOME_ASSISTANT_HOST;
const HOME_ASSISTANT_TOKEN = import.meta.env.VITE_HOME_ASSISTANT_TOKEN;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

const isDevelopment = import.meta.env.DEV;

const USE_EDGE_FUNCTION = !isDevelopment && !!SUPABASE_URL;
const USE_VITE_PROXY = isDevelopment;

const buildApiUrl = (endpoint: string): string => {
  if (USE_EDGE_FUNCTION) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${SUPABASE_URL}/functions/v1/home-assistant-proxy?path=${encodeURIComponent(cleanEndpoint)}`;
  }
  
  if (USE_VITE_PROXY) {
    return `/api/home-assistant${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  }
  
  return `${HOME_ASSISTANT_HOST}/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
};

export interface HomeAssistantState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface HomeAssistantServiceCall {
  domain: string;
  service: string;
  service_data?: Record<string, any>;
  target?: {
    entity_id?: string | string[];
  };
}

export class HomeAssistantError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'HomeAssistantError';
  }
}

export async function getEntityState(entityId: string): Promise<HomeAssistantState> {
  if (!isDevelopment && !SUPABASE_URL) {
    throw new HomeAssistantError('Configuración de backend no disponible');
  }
  if (isDevelopment && !HOME_ASSISTANT_HOST) {
    throw new HomeAssistantError('Home Assistant host no configurado');
  }

  try {
    const url = buildApiUrl(`/states/${entityId}`);
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (USE_VITE_PROXY) {
      if (HOME_ASSISTANT_TOKEN) {
        headers['Authorization'] = `Bearer ${HOME_ASSISTANT_TOKEN}`;
      }
      headers['ngrok-skip-browser-warning'] = 'true';
    } else if (USE_EDGE_FUNCTION && SUPABASE_ANON_KEY) {
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
      headers['apikey'] = SUPABASE_ANON_KEY;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      mode: USE_VITE_PROXY ? 'same-origin' : 'cors',
      signal: AbortSignal.timeout(30000),
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new HomeAssistantError(
        'El servidor devolvió una página HTML en lugar de JSON. Verifica que el túnel de ngrok esté activo y correctamente configurado.',
        response.status,
        { htmlResponse: true, proxyError: true }
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 502 || response.status === 504) {
        const errorMessage = errorData.message || errorData.details || 'Túnel de ngrok no disponible';
        throw new HomeAssistantError(
          `Túnel no disponible: ${errorMessage}`,
          response.status,
          { ...errorData, proxyError: true }
        );
      }
      
      throw new HomeAssistantError(
        `Error al obtener estado de ${entityId}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof HomeAssistantError) {
      throw error;
    }
    
    if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
      throw new HomeAssistantError(
        'El servidor no respondió correctamente. Verifica que el túnel de ngrok esté activo.',
        0,
        { htmlResponse: true, proxyError: true }
      );
    }
    
    if (error instanceof Error && (error.name === 'TimeoutError' || error.message.includes('timeout'))) {
      throw new HomeAssistantError(
        'Tiempo de espera agotado. Intenta nuevamente.',
        0,
        { timeout: true }
      );
    }
    
    if (error instanceof TypeError && (error.message.includes('Failed to fetch') || error.message.includes('network'))) {
      throw new HomeAssistantError(
        'Error de red. Verifica tu conexión a internet.',
        0,
        { networkError: true }
      );
    }
    
    if (error instanceof TypeError && (error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin'))) {
      throw new HomeAssistantError(
        'Error de CORS. Configura los permisos en Home Assistant.',
        0,
        { corsError: true }
      );
    }
    
    throw new HomeAssistantError(
      `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

export async function callService(
  domain: string,
  service: string,
  serviceData?: Record<string, any>
): Promise<any> {
  if (!isDevelopment && !SUPABASE_URL) {
    throw new HomeAssistantError('Configuración de backend no disponible');
  }
  if (isDevelopment && !HOME_ASSISTANT_HOST) {
    throw new HomeAssistantError('Home Assistant host no configurado');
  }

  try {
    const url = buildApiUrl(`/services/${domain}/${service}`);
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (USE_VITE_PROXY) {
      if (HOME_ASSISTANT_TOKEN) {
        headers['Authorization'] = `Bearer ${HOME_ASSISTANT_TOKEN}`;
      }
      headers['ngrok-skip-browser-warning'] = 'true';
    } else if (USE_EDGE_FUNCTION && SUPABASE_ANON_KEY) {
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
      headers['apikey'] = SUPABASE_ANON_KEY;
    }

    const body = JSON.stringify(serviceData || {});

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      mode: USE_VITE_PROXY ? 'same-origin' : 'cors',
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new HomeAssistantError(
        'El servidor devolvió una página HTML. Verifica que el túnel esté activo.',
        response.status,
        { htmlResponse: true, proxyError: true }
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 502 || response.status === 504) {
        const errorMessage = errorData.message || errorData.details || 'Túnel no disponible';
        throw new HomeAssistantError(
          `Túnel no disponible: ${errorMessage}`,
          response.status,
          { ...errorData, proxyError: true }
        );
      }
      
      throw new HomeAssistantError(
        `Error al ejecutar ${domain}.${service}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof HomeAssistantError) {
      throw error;
    }
    
    if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
      throw new HomeAssistantError(
        'Respuesta inválida del servidor. Verifica el túnel de ngrok.',
        0,
        { htmlResponse: true, proxyError: true }
      );
    }
    
    if (error instanceof TypeError && (error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin'))) {
      throw new HomeAssistantError(
        'Error de CORS. Configura los permisos en Home Assistant.',
        0,
        { corsError: true }
      );
    }
    throw new HomeAssistantError(
      `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

export async function unlockYaleLock(entityId: string): Promise<void> {
  if (!HOME_ASSISTANT_HOST) {
    throw new HomeAssistantError('Home Assistant host no configurado. Verifica VITE_HOME_ASSISTANT_HOST en .env');
  }

  if (!HOME_ASSISTANT_TOKEN) {
    throw new HomeAssistantError('Home Assistant token no configurado. Verifica VITE_HOME_ASSISTANT_TOKEN en .env');
  }

  await callService('lock', 'unlock', {
    entity_id: entityId,
  });
}

export async function lockYaleLock(entityId: string): Promise<void> {
  if (!HOME_ASSISTANT_HOST) {
    throw new HomeAssistantError('Home Assistant host no configurado. Verifica VITE_HOME_ASSISTANT_HOST en .env');
  }

  if (!HOME_ASSISTANT_TOKEN) {
    throw new HomeAssistantError('Home Assistant token no configurado. Verifica VITE_HOME_ASSISTANT_TOKEN en .env');
  }

  await callService('lock', 'lock', {
    entity_id: entityId,
  });
}

export async function getYaleLockState(entityId: string): Promise<HomeAssistantState> {
  return await getEntityState(entityId);
}

export async function turnOnSwitch(entityId: string): Promise<void> {
  await callService('switch', 'turn_on', {
    entity_id: entityId,
  });
}

export async function turnOffSwitch(entityId: string): Promise<void> {
  await callService('switch', 'turn_off', {
    entity_id: entityId,
  });
}

export async function toggleSwitch(entityId: string): Promise<void> {
  await callService('switch', 'toggle', {
    entity_id: entityId,
  });
}

export async function openCover(entityId: string): Promise<void> {
  await callService('cover', 'open_cover', {
    entity_id: entityId,
  });
}

export async function closeCover(entityId: string): Promise<void> {
  await callService('cover', 'close_cover', {
    entity_id: entityId,
  });
}

export async function stopCover(entityId: string): Promise<void> {
  await callService('cover', 'stop_cover', {
    entity_id: entityId,
  });
}

export async function toggleCover(entityId: string): Promise<void> {
  const state = await getEntityState(entityId);
  const isOpen = state.state === 'open' || state.state === 'OPEN';
  
  if (isOpen) {
    await closeCover(entityId);
  } else {
    await openCover(entityId);
  }
}

export async function checkHomeAssistantConnection(): Promise<boolean> {
  if (!isDevelopment && !SUPABASE_URL) {
    return false;
  }
  if (isDevelopment && !HOME_ASSISTANT_HOST) {
    return false;
  }

  try {
    const url = buildApiUrl('/config');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (USE_VITE_PROXY) {
      headers['ngrok-skip-browser-warning'] = 'true';
      if (HOME_ASSISTANT_TOKEN) {
        headers['Authorization'] = `Bearer ${HOME_ASSISTANT_TOKEN}`;
      }
    } else if (USE_EDGE_FUNCTION && SUPABASE_ANON_KEY) {
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
      headers['apikey'] = SUPABASE_ANON_KEY;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      mode: USE_VITE_PROXY ? 'same-origin' : 'cors',
    });

    if (response.ok) {
      return true;
    } else if (response.status === 401) {
      return true;
    } else if (response.status === 502 || response.status === 504) {
      console.error('[Home Assistant] Proxy error:', response.status);
      return false;
    } else {
      console.warn('[Home Assistant] Connection check returned:', response.status);
      return false;
    }
  } catch (_error) {
    return false;
  }
}

export async function listLockEntities(): Promise<string[]> {
  if (!isDevelopment && !SUPABASE_URL) {
    throw new HomeAssistantError('Configuración de backend no disponible');
  }

  try {
    const url = buildApiUrl('/states');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (USE_VITE_PROXY) {
      if (HOME_ASSISTANT_TOKEN) {
        headers['Authorization'] = `Bearer ${HOME_ASSISTANT_TOKEN}`;
      }
      headers['ngrok-skip-browser-warning'] = 'true';
    } else if (USE_EDGE_FUNCTION && SUPABASE_ANON_KEY) {
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
      headers['apikey'] = SUPABASE_ANON_KEY;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      mode: USE_VITE_PROXY ? 'same-origin' : 'cors',
    });

    if (!response.ok) {
      if (response.status === 502 || response.status === 504) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.details || 'Túnel de ngrok no disponible';
        throw new HomeAssistantError(
          `Error de conexión con Home Assistant: ${errorMessage}. Verifica que ngrok esté activo en ${HOME_ASSISTANT_HOST || 'el host configurado'}`,
          response.status,
          { ...errorData, proxyError: true }
        );
      }
      
      throw new HomeAssistantError(
        `Error al listar entidades: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    const entities = Array.isArray(data) ? data : Object.values(data || {});
    
    const lockEntities = entities
      .filter((entity: any) => entity.entity_id?.startsWith('lock.'))
      .map((entity: any) => entity.entity_id)
      .sort();
    
    return lockEntities;
  } catch (error) {
    if (error instanceof HomeAssistantError) {
      throw error;
    }
    throw new HomeAssistantError(
      `Error de conexión al listar entidades: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).listLockEntities = listLockEntities;
}

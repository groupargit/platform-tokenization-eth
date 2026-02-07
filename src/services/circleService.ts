function getCircleProxyUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/circle-proxy`;
  }
  return 'https://yvcspsbgphllchghpakt.supabase.co/functions/v1/circle-proxy';
}

export interface CircleWallet {
  id: string;
  address?: string;
  state: 'PENDING' | 'LIVE' | 'FROZEN' | 'TERMINATED';
  walletSetId: string;
  custodyType: 'DEVELOPER' | 'ENDUSER';
  createdAt: string;
  updatedAt: string;
  blockchain?: string;
}

export interface CircleBalance {
  amount: string;
  currency: string;
  updateDate: string;
}

export interface CircleTransaction {
  id: string;
  state: 'PENDING' | 'COMPLETED' | 'FAILED';
  type: 'TRANSFER' | 'MINT' | 'BURN' | 'APPROVAL';
  walletId: string;
  source: {
    type: string;
    id: string;
    address?: string;
  };
  destination: {
    type: string;
    id: string;
    address?: string;
  };
  amount: {
    amount: string;
    currency: string;
  };
  fee?: {
    amount: string;
    currency: string;
  };
  transactionHash?: string;
  createDate: string;
  updateDate: string;
}

export interface CircleWalletSet {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWalletMetadataItem {
  name?: string;
  refId?: string;
}

export interface CreateWalletRequest {
  idempotencyKey: string;
  blockchains: string[];
  walletSetId: string;
  entitySecretCiphertext?: string;
  accountType?: 'SCA' | 'EOA';
  count?: number;
  metadata?: CreateWalletMetadataItem[];
}

export interface CreateTransferRequest {
  idempotencyKey?: string;
  walletId: string;
  destinationAddress: string;
  amounts: string[];
  tokenId?: string;
  tokenAddress?: string;
  blockchain?: string;
  feeLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  refId?: string;
}

export interface ValidateAddressRequest {
  address: string;
  blockchain: string;
}

export interface ValidateAddressResponse {
  isValid: boolean;
}

export interface EstimateFeeRequest {
  amounts: string[];
  destinationAddress: string;
  walletId: string;
  tokenId?: string;
  tokenAddress?: string;
  blockchain?: string;
}

export interface EstimateFeeResponse {
  gasLimit: string;
  gasPrice?: string;
  maxFee: string;
  priorityFee: string;
  baseFee: string;
  networkFee: string;
}

export interface CircleApiError {
  code: number;
  message: string;
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

class CircleService {
  private environment: 'sandbox' | 'production';

  private requestUrl(path: string): string {
    const proxyBase = getCircleProxyUrl();
    return `${proxyBase}${path.startsWith('/') ? path : '/' + path}`;
  }

  constructor() {
    this.environment = (import.meta.env.VITE_CIRCLE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';
  }

  private getAuthHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  private generateIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    const hex = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex(4)}-${hex(2)}-4${hex(2).slice(0, 3)}-${['8', '9', 'a', 'b'][Math.floor(Math.random() * 4)]}${hex(2).slice(0, 3)}-${hex(6)}`;
  }

  private async parseJsonOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
    const text = await response.text();
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json') && text.trimStart().startsWith('<')) {
      throw new Error(
        fallbackMessage +
          (response.ok ? '' : ` (servidor devolvió HTML en lugar de JSON; comprueba la URL del proxy o la API)`)
      );
    }
    try {
      return text ? (JSON.parse(text) as T) : ({} as T);
    } catch {
      throw new Error(fallbackMessage + (text ? ` Respuesta: ${text.slice(0, 200)}` : ''));
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let error: CircleApiError;
      try {
        const text = await response.text();
        error = text && !text.trimStart().startsWith('<') ? JSON.parse(text) : { code: response.status, message: '' };
      } catch {
        error = { code: response.status, message: '' };
      }
      const proxyError = (error as unknown as { error?: string }).error;
      if (!error.message && proxyError) {
        error.message = proxyError;
      }
      if (!error.message) {
        error.message = `HTTP ${response.status}: ${response.statusText}. Si ves HTML, la URL del proxy o la API puede ser incorrecta.`;
      }
      throw new Error(error.message || `Circle API Error: ${error.code}`);
    }
    return this.parseJsonOrThrow<T>(response, 'Circle API devolvió una respuesta no válida.');
  }

  async createWallet(data: Partial<CreateWalletRequest> & { blockchains: string[]; walletSetId: string }): Promise<{ data: CircleWallet | CircleWallet[] }> {
    const idempotencyKey = data.idempotencyKey || this.generateIdempotencyKey();
    const count = data.count ?? 1;
    const metadata = data.metadata;
    const body: Record<string, unknown> = {
      idempotencyKey,
      blockchains: data.blockchains,
      walletSetId: data.walletSetId,
      entitySecretCiphertext: data.entitySecretCiphertext,
      accountType: data.accountType ?? 'SCA',
      count,
    };
    if (metadata != null && Array.isArray(metadata) && metadata.length === count) {
      body.metadata = metadata;
    }
    const response = await fetch(this.requestUrl('/v1/w3s/developer/wallets'), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
    });

    const raw = await this.handleResponse<{ data: CircleWallet[] | { wallets: CircleWallet[] } }>(response);
    const walletsArray = Array.isArray(raw.data)
      ? raw.data
      : (raw.data && (raw.data as { wallets?: CircleWallet[] }).wallets) || [];
    return { data: walletsArray };
  }

  async getWallet(walletId: string): Promise<{ data: CircleWallet }> {
    const response = await fetch(this.requestUrl(`/v1/w3s/wallets/${walletId}`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const raw = await this.handleResponse<{ data: CircleWallet | { wallet: CircleWallet } }>(response);
    const wallet = (raw.data && 'wallet' in raw.data) ? raw.data.wallet : raw.data;
    return { data: wallet as CircleWallet };
  }

  async listWallets(options?: {
    pageSize?: number;
    pageBefore?: string;
    pageAfter?: string;
  }): Promise<{ data: CircleWallet[] }> {
    const params = new URLSearchParams();
    if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
    if (options?.pageBefore) params.append('pageBefore', options.pageBefore);
    if (options?.pageAfter) params.append('pageAfter', options.pageAfter);

    const url = this.requestUrl(`/v1/w3s/wallets${params.toString() ? `?${params.toString()}` : ''}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<{ data: CircleWallet[] }>(response);
  }

  async getBalance(walletId: string): Promise<{ data: CircleBalance[] }> {
    const response = await fetch(this.requestUrl(`/v1/w3s/wallets/${walletId}/balances`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const raw = await this.handleResponse<{ data: CircleBalance[] | { tokenBalances?: Array<{ amount: string; updateDate?: string; token?: { symbol?: string } }> } }>(response);
    if (Array.isArray(raw.data)) {
      return { data: raw.data };
    }
    const tokenBalances = raw.data?.tokenBalances;
    const list = Array.isArray(tokenBalances)
      ? tokenBalances.map((tb) => ({
          amount: tb.amount,
          currency: tb.token?.symbol ?? 'UNKNOWN',
          updateDate: tb.updateDate ?? '',
        }))
      : [];
    return { data: list };
  }

  async listTransactions(
    walletId: string,
    options?: {
      pageSize?: number;
      pageBefore?: string;
      pageAfter?: string;
      transactionHash?: string;
    }
  ): Promise<{ data: CircleTransaction[] }> {
    const params = new URLSearchParams();
    params.append('walletIds', walletId);
    if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
    if (options?.pageBefore) params.append('pageBefore', options.pageBefore);
    if (options?.pageAfter) params.append('pageAfter', options.pageAfter);
    if (options?.transactionHash) params.append('txHash', options.transactionHash);

    const url = this.requestUrl(`/v1/w3s/transactions?${params.toString()}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const raw = await this.handleResponse<{ data: CircleTransaction[] | { transactions: CircleTransaction[] } }>(response);
    const list = Array.isArray(raw.data)
      ? raw.data
      : (raw.data && (raw.data as { transactions?: CircleTransaction[] }).transactions) || [];
    return { data: list };
  }

  async createTransfer(data: CreateTransferRequest): Promise<{ data: CircleTransaction }> {
    const idempotencyKey = data.idempotencyKey ?? this.generateIdempotencyKey();
    const response = await fetch(this.requestUrl('/v1/w3s/developer/transactions/transfer'), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        idempotencyKey,
        walletId: data.walletId,
        destinationAddress: data.destinationAddress,
        amounts: data.amounts,
        tokenId: data.tokenId,
        tokenAddress: data.tokenAddress,
        blockchain: data.blockchain || 'MATIC-AMOY',
        feeLevel: data.feeLevel || 'MEDIUM',
        refId: data.refId,
      }),
    });

    return this.handleResponse<{ data: CircleTransaction }>(response);
  }

  async validateAddress(data: ValidateAddressRequest): Promise<{ data: ValidateAddressResponse }> {
    const response = await fetch(this.requestUrl('/v1/w3s/transactions/validateAddress'), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        address: data.address,
        blockchain: data.blockchain,
      }),
    });

    return this.handleResponse<{ data: ValidateAddressResponse }>(response);
  }

  async estimateFee(data: EstimateFeeRequest): Promise<{ data: EstimateFeeResponse }> {
    const response = await fetch(this.requestUrl('/v1/w3s/transactions/transfer/estimateFee'), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        amounts: data.amounts,
        destinationAddress: data.destinationAddress,
        walletId: data.walletId,
        tokenId: data.tokenId,
        tokenAddress: data.tokenAddress,
        blockchain: data.blockchain || 'MATIC-AMOY',
      }),
    });

    return this.handleResponse<{ data: EstimateFeeResponse }>(response);
  }

  async getTransaction(transactionId: string): Promise<{ data: CircleTransaction }> {
    const response = await fetch(this.requestUrl(`/v1/w3s/transactions/${transactionId}`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<{ data: CircleTransaction }>(response);
  }

  async createWalletSet(name: string): Promise<{ data: { walletSet: CircleWalletSet } }> {
    const idempotencyKey = crypto.randomUUID();
    const body = {
      name: name || 'Casa Color',
      idempotencyKey,
    };
    const response = await fetch(this.requestUrl('/v1/w3s/developer/walletSets'), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
    });

    return this.handleResponse<{ data: { walletSet: CircleWalletSet } }>(response);
  }

  async listWalletSets(): Promise<{ data: CircleWalletSet[] }> {
    const response = await fetch(this.requestUrl('/v1/w3s/walletSets'), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<{ data: CircleWalletSet[] }>(response);
  }

  isConfigured(): boolean {
    return true;
  }

  getEnvironment(): 'sandbox' | 'production' {
    return this.environment;
  }
}

export const circleService = new CircleService();

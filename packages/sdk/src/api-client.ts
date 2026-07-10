export interface ApiClientOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly fetchFn?: typeof fetch;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('content-type', 'application/json');
    headers.set('authorization', `Bearer ${this.apiKey}`);

    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    const body: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      throw new ApiError(
        `Request to ${path} failed with status ${String(response.status)}`,
        response.status,
        body,
      );
    }

    return body as T;
  }
}

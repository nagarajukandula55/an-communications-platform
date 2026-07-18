export interface AnuReportClientOptions {
  /** ANgroup's base URL, e.g. https://angroup.in */
  readonly baseUrl: string;
  /** Matches ANgroup's ANU_SERVICE_KEY env var - service-to-service auth, no human session. */
  readonly serviceKey: string;
  readonly fetchImpl?: typeof fetch;
}

export type AnuIssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AnuIssueReport {
  readonly title: string;
  readonly description: string;
  readonly severity?: AnuIssueSeverity;
  /** Which system is reporting - required for service-authenticated reports. */
  readonly source: string;
  readonly businessId?: string;
}

/**
 * Reports a problem to ANgroup's ANu Issues & Reports inbox
 * (POST /api/anu/issues), the same admin queue every other AN Group
 * property (this admin panel, native's storefront) reports through - see
 * ANgroup's src/app/api/anu/issues/route.ts for the service-auth path this
 * client authenticates against (x-service-key, not a human session).
 *
 * Never throws for a caller that doesn't want to handle failures inline -
 * callers that need to know can check the returned result's `ok` field.
 * The intended use (see dead-letter-reporter.ts) is best-effort: a failed
 * report must never crash whatever ACP process is reporting it.
 */
export class AnuReportClient {
  private readonly baseUrl: string;
  private readonly serviceKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: AnuReportClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.serviceKey = options.serviceKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async report(issue: AnuIssueReport): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/api/anu/issues`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-service-key': this.serviceKey,
        },
        body: JSON.stringify(issue),
      });

      const data = (await res.json().catch(() => ({}))) as { success?: boolean; id?: string; message?: string };

      if (!res.ok || data.success === false) {
        return { ok: false, error: data.message ?? `Request failed (${res.status})` };
      }

      return { ok: true, id: data.id ?? '' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }
}

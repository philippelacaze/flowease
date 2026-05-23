import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EMPTY, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Wrappeur HTTP bas niveau pour l'API Anthropic Messages.
 *
 * @remarks
 * Classe simple (pas @Injectable) — instanciée par AnthropicAdapter qui
 * lui passe HttpClient. Responsabilité unique : construire les headers et
 * gérer les erreurs réseau sans jamais propager la clé API.
 * La clé API n'est jamais stockée en propriété de classe.
 */
export class AnthropicClient {
  constructor(private readonly http: HttpClient) {}

  /**
   * Envoie une requête POST à l'API Anthropic Messages.
   *
   * @param payload - Corps de la requête (model, messages, max_tokens, etc.)
   * @param apiKey - Clé API lue depuis LocalSettingsAdapter — jamais loguée
   * @returns Observable<T> ou EMPTY en cas d'erreur réseau
   */
  post<T>(payload: Record<string, unknown>, apiKey: string): Observable<T> {
    return this.http
      .post<T>(ANTHROPIC_API_URL, payload, {
        headers: this.buildHeaders(apiKey),
      })
      .pipe(catchError(() => this.handleError()));
  }

  /**
   * Construit les headers requis par l'API Anthropic.
   *
   * @param apiKey - Clé API — jamais loguée, jamais incluse dans les erreurs
   * @returns HttpHeaders avec x-api-key, anthropic-version et content-type
   */
  buildHeaders(apiKey: string): HttpHeaders {
    return new HttpHeaders({
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    });
  }

  /**
   * Retourne EMPTY en cas d'erreur réseau — jamais throw, jamais log de clé.
   *
   * @returns Observable<never> (EMPTY)
   */
  private handleError(): Observable<never> {
    return EMPTY;
  }
}

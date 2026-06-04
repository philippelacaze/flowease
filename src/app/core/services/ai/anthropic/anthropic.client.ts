import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Wrappeur HTTP bas niveau pour l'API Anthropic Messages.
 *
 * @remarks
 * Classe simple (pas @Injectable) — instanciée par AiService qui
 * lui passe HttpClient. Responsabilité unique : construire les headers et
 * convertir les erreurs HTTP en Error typées par status.
 * La clé API n'est jamais stockée en propriété de classe ni incluse dans
 * les messages d'erreur.
 */
export class AnthropicClient {
  constructor(private readonly http: HttpClient) {}

  /**
   * Envoie une requête POST à l'API Anthropic Messages.
   *
   * @param payload - Corps de la requête (model, messages, max_tokens, etc.)
   * @param apiKey - Clé API lue depuis LocalSettingsService — jamais loguée
   * @returns Observable<T> ou throwError avec message lisible par status HTTP
   */
  post<T>(payload: Record<string, unknown>, apiKey: string): Observable<T> {
    return this.http
      .post<T>(ANTHROPIC_API_URL, payload, {
        headers: this.buildHeaders(apiKey),
      })
      .pipe(catchError((err: HttpErrorResponse) => this.handleHttpError(err)));
  }

  /**
   * Construit les headers requis par l'API Anthropic.
   *
   * @param apiKey - Clé API — jamais loguée, jamais incluse dans les erreurs
   * @returns HttpHeaders avec x-api-key, anthropic-version, content-type
   *          et anthropic-dangerous-direct-browser-access (requis en navigateur)
   */
  buildHeaders(apiKey: string): HttpHeaders {
    return new HttpHeaders({
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    });
  }

  /**
   * Convertit une HttpErrorResponse en Error avec message lisible par status.
   * La clé API n'apparaît jamais dans le message.
   *
   * @param err - Erreur HTTP d'Angular HttpClient
   * @returns Observable<never> (throwError)
   */
  private handleHttpError(err: HttpErrorResponse): Observable<never> {
    if (err.status === 401) {
      return throwError(() => new Error('Clé API invalide — vérifiez votre clé sur console.anthropic.com (401)'));
    }
    if (err.status === 429) {
      return throwError(() => new Error('Quota Anthropic dépassé — réessayez plus tard (429)'));
    }
    if (err.status > 0) {
      return throwError(() => new Error(`Erreur Anthropic ${err.status}`));
    }
    return throwError(() => new Error('Erreur réseau — vérifiez votre connexion internet'));
  }
}

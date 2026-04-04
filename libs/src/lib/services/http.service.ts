import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvironmentService } from './environment.service';

@Injectable({
  providedIn: 'root',
})
export class HttpService {
  private _http = inject(HttpClient);
  private _environment = inject(EnvironmentService);

  private _url(url: string): string {
    return this._environment.getContext() + url;
  }

  get<T>(url: string): Observable<T> {
    return this._http.get<T>(this._url(url));
  }

  post<T>(url: string, body: unknown | null): Observable<T> {
    return this._http.post<T>(this._url(url), body);
  }

  put<T>(url: string, body: unknown | null): Observable<T> {
    return this._http.put<T>(this._url(url), body);
  }

  patch<T>(url: string, body: unknown | null): Observable<T> {
    return this._http.patch<T>(this._url(url), body);
  }

  delete<T>(url: string): Observable<T> {
    return this._http.delete<T>(this._url(url));
  }

  head<T>(url: string): Observable<T> {
    return this._http.head<T>(this._url(url));
  }

  options<T>(url: string): Observable<T> {
    return this._http.options<T>(this._url(url));
  }
}

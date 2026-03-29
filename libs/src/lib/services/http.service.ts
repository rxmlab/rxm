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

  get<T>(url: string): Observable<T> {
    return this._http.get<T>(this._environment.getContext() + url);
  }

  post() {}
}

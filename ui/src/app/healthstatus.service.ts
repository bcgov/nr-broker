import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class HealthstatusService {
  constructor(private http: HttpClient) {}

  healthCheck() {
    return this.http.get<any>(`${environment.apiUrl}/v1/health`);
  }
}

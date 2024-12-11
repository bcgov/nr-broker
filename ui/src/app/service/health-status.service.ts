import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, interval, startWith, switchMap } from 'rxjs';

import { environment } from '../../environments/environment';
import { HealthCheckDto } from './dto/health-check.dto';

@Injectable({
  providedIn: 'root',
})
export class HealthStatusService {
  private healthSubject = new BehaviorSubject<null | HealthCheckDto>(null);
  public health$ = this.healthSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    this.startPolling();
  }

  public healthCheck() {
    return this.http.get<HealthCheckDto>(`${environment.apiUrl}/v1/health`);
  }

  private startPolling() {
    // Emit a value every 60000 milliseconds
    interval(60000)
      .pipe(
        startWith(0),
        switchMap(() => this.healthCheck()),
      )
      .subscribe({
        next: (data) => {
          this.healthSubject.next(data); // Emit the new data
        },
        error: (error) => {
          console.error('Error fetching health data:', error);
          this.healthSubject.next(null);
        },
      });
  }
}

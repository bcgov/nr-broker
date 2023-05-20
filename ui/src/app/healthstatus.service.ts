import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class HealthstatusService {

  constructor(private http: HttpClient) {}

  healthCheck(){
    return this.http.get<any>(`${environment.apiUrl}/v1/health`,
      {
        responseType: 'json',
      },
    ).pipe(
      catchError((error)=>{
        console.log("service fail",error);
        throw error;
      })
    );
  }



}

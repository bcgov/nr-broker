import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { INITIAL_PREFERENCES } from './app-initialize.factory';
import { PreferenceRestDto } from './preference-rest.dto';

@Injectable({
  providedIn: 'root',
})
export class PreferencesService {
  constructor(
    private http: HttpClient,
    @Inject(INITIAL_PREFERENCES) private preferences: PreferenceRestDto,
  ) {}

  get(key: keyof PreferenceRestDto): PreferenceRestDto[typeof key] {
    return this.preferences[key];
  }

  set(key: keyof PreferenceRestDto, value: PreferenceRestDto[typeof key]) {
    this.preferences[key] = value;

    this.writePreferences();
  }

  private writePreferences() {
    this.http.post<boolean>(
      `${environment.apiUrl}/v1/preference/self`,
      this.preferences,
      {
        responseType: 'json',
      },
    );
  }
}

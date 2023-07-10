import { EventEmitter, Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { INITIAL_PREFERENCES } from './app-initialize.factory';
import { PreferenceRestDto } from './preference-rest.dto';

@Injectable({
  providedIn: 'root',
})
export class PreferencesService {
  public _onSet = new EventEmitter<{
    key: keyof PreferenceRestDto;
    value: PreferenceRestDto[keyof PreferenceRestDto];
  }>();

  constructor(
    private http: HttpClient,
    @Inject(INITIAL_PREFERENCES) private preferences: PreferenceRestDto,
  ) {}

  get onSet() {
    return this._onSet.asObservable();
  }

  get<K extends keyof PreferenceRestDto>(key: K): PreferenceRestDto[K] {
    return this.preferences[key];
  }

  set<K extends keyof PreferenceRestDto>(key: K, value: PreferenceRestDto[K]) {
    const currentValue = this.preferences[key];
    if (typeof currentValue === 'object' && typeof value === 'object') {
      this.preferences[key] = {
        ...(currentValue ?? {}),
        ...value,
      };
    } else {
      this.preferences[key] = value;
    }
    this._onSet.emit({
      key,
      value,
    });

    this.writePreferences().subscribe();
  }

  private writePreferences() {
    return this.http.post<boolean>(
      `${environment.apiUrl}/v1/preference/self`,
      this.preferences,
      {
        responseType: 'json',
      },
    );
  }
}

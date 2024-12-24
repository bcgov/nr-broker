import { EventEmitter, Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { INITIAL_PREFERENCES } from './app-initialize.factory';
import { PreferenceDto } from './service/persistence/dto/preference.dto';

@Injectable({
  providedIn: 'root',
})
export class PreferencesService {
  public _onSet = new EventEmitter<{
    key: keyof PreferenceDto;
    value?: PreferenceDto[keyof PreferenceDto];
  }>();

  constructor(
    private readonly http: HttpClient,
    @Inject(INITIAL_PREFERENCES)
    private readonly preferences: PreferenceDto,
  ) {}

  get onSet() {
    return this._onSet.asObservable();
  }

  get<K extends keyof PreferenceDto>(key: K): PreferenceDto[K] {
    return this.preferences[key];
  }

  set<K extends keyof PreferenceDto>(key: K, value: PreferenceDto[K]) {
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

  reset<K extends keyof PreferenceDto>(keys: K[]) {
    for (const key of keys) {
      delete this.preferences[key];
      this._onSet.emit({
        key,
      });
    }

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

import { Injectable, inject } from '@angular/core';
import { FEATURE_FLAGS } from '../app-initialize.factory';
import { FeatureFlagsDto } from './persistence/dto/feature-flags.dto';

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagService {
  private readonly flags = inject<FeatureFlagsDto>(FEATURE_FLAGS);

  isEnabled<K extends keyof FeatureFlagsDto>(flag: K): boolean {
    return this.flags?.[flag] === true;
  }
}

import { Directive, forwardRef } from '@angular/core';
import {
  AbstractControl,
  NG_VALIDATORS,
  ValidationErrors,
  Validator,
} from '@angular/forms';

function isValidIpv4Segment(segment: string) {
  if (!/^\d+$/.test(segment)) {
    return false;
  }

  const value = Number.parseInt(segment, 10);
  return value >= 0 && value <= 255 && segment === String(value);
}

function isValidCidrEntry(entry: string) {
  const parts = entry.split('/');
  if (parts.length !== 2) {
    return false;
  }

  const [ip, prefix] = parts;
  if (!/^\d+$/.test(prefix)) {
    return false;
  }

  const prefixValue = Number.parseInt(prefix, 10);
  if (prefixValue < 0 || prefixValue > 32) {
    return false;
  }

  const segments = ip.split('.');
  return segments.length === 4 && segments.every(isValidIpv4Segment);
}

export function isValidCidrList(value: unknown) {
  if (typeof value !== 'string') {
    return true;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  const entries = trimmed
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return entries.length > 0 && entries.every(isValidCidrEntry);
}

@Directive({
  selector: '[appCidrList]',
  standalone: true,
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => CidrListValidatorDirective),
      multi: true,
    },
  ],
})
export class CidrListValidatorDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    return isValidCidrList(control.value)
      ? null
      : {
          cidrList: {
            message:
              'Enter a valid CIDR such as 10.0.0.0/24. Separate multiple values with commas.',
          },
        };
  }
}

import {
  AbstractControl,
  AsyncValidatorFn,
  ValidationErrors,
} from '@angular/forms';
import { Observable, catchError, map, of } from 'rxjs';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionDtoUnion } from '../../service/persistence/dto/collection-dto-union.type';

/** A unique field can't reuse a value */
export function uniqueNameValidator(
  collectionService: CollectionApiService,
  collection: keyof CollectionDtoUnion,
  key: string,
  id: string | null,
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    return collectionService
      .doUniqueKeyCheck(collection, key, control.value)
      .pipe(
        map((ids) => ids.filter((foundId) => foundId !== id)),
        map((ids) => (ids.length > 0 ? { unique: true } : null)),
        catchError(() => of(null)),
      );
  };
}

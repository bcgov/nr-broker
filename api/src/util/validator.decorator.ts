import { ValidationOptions, isHash, registerDecorator } from 'class-validator';

export function IsValidHash(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidHash',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value === 'string') {
            const [algo, hash] = value.split(':');
            return isHash(hash, algo as any);
          } else {
            return false;
          }
        },
      },
    });
  };
}

export function IsValidProp(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidProp',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any) {
          return (
            typeof value === 'object' &&
            Object.entries(value).every(([k, v]) => {
              return (
                typeof k === 'string' &&
                (typeof v === 'string' || v instanceof String)
              );
            })
          );
        },
      },
    });
  };
}

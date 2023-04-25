import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GraphUtilService {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  snakecase(str: string) {
    return str.replace(
      /[A-Z]/g,
      (letter: string) => `-${letter.toLowerCase()}`,
    );
  }
}

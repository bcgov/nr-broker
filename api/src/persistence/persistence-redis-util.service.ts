import { Injectable } from '@nestjs/common';

const REDIS_ESCAPES_REPLACEMENTS = {
  ',': '\\,',
  '.': '\\.',
  '<': '\\<',
  '>': '\\>',
  '{': '\\{',
  '}': '\\}',
  '[': '\\[',
  ']': '\\]',
  '"': '\\"',
  "'": "\\'",
  ':': '\\:',
  ';': '\\;',
  '!': '\\!',
  '@': '\\@',
  '#': '\\#',
  $: '\\$',
  '%': '\\%',
  '^': '\\^',
  '&': '\\&',
  '*': '\\*',
  '(': '\\(',
  ')': '\\)',
  '-': '\\-',
  '+': '\\+',
  '=': '\\=',
  '~': '\\~',
  '\\': '\\\\',
};

@Injectable()
export class PersistenceRedisUtilService {
  public escapeRedisStr(value: string) {
    const newValue = value.replace(
      /,|\.|<|>|\{|\}|\[|\]|"|'|:|;|!|@|#|\$|%|\^|&|\*|\(|\)|-|\+|=|~|\\/g,
      function (x) {
        return REDIS_ESCAPES_REPLACEMENTS[x];
      },
    );
    return newValue;
  }
}

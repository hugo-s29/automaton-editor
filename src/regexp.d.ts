declare module "regexp";

import { RegExp } from './regexp_types'

declare const SyntaxError: SyntaxError;
declare function parse(input: string): RegExp;

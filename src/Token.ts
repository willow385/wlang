import { PrimitiveType } from "./Types";

enum TokenType {
  ReservedWord,
};

type ReservedWord =
  "let"
  | "funct"
  | "macro"
  | "extern"
  | "result"
  | "varargs"
  | PrimitiveType;

export interface Token {
  type: TokenType,
  token: string
};

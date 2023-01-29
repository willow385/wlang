import { Nothing, PrimitiveType } from "./Types";

export enum TokenType {
  ReservedWord = "Reserved Word",
  Identifier = "Identifier",
  OpenParen = "(", CloseParen = ")",
  ColonDash = ":-",
  Colon = ":",
  Arrow = "=>",
  Equals = "=",
  OpenBrace = "{", CloseBrace = "}",
  CstringSigil = "c",
  DoubleQuote = '"', SingleQuote = "'",
  Semicolon = ";",
  WholeNumber = "Whole Number", Float = "Float",
  End = "End of File"
};

export type ReservedWord =
  "let"
  | "funct"
  | "macro"
  | "extern"
  | "result"
  | "varargs"
  | PrimitiveType
  | Nothing;

export interface IToken {
  type: TokenType,
  value: bigint | number | string
};

export type ReservedWordToken = {
  type: TokenType.ReservedWord,
  value: ReservedWord
};

export type WholeNumberToken = {
  type: TokenType.WholeNumber,
  value: bigint
};

export type FloatToken = {
  type: TokenType.Float,
  value: number
};

export type NumberToken = WholeNumberToken | FloatToken;

export type Token =
  ReservedWordToken
  | NumberToken
  | { type: TokenType, value: string };

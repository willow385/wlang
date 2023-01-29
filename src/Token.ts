import { Nothing, PrimitiveType, primitiveTypes } from "./Types";

export enum TokenType {
  ReservedWord = "Reserved Word",
  Identifier = "Identifier",
  OpenParen = "(", CloseParen = ")",
  ColonDash = ":-",
  Colon = ":",
  Minus = "-",
  Arrow = "=>",
  Equals = "=",
  OpenBrace = "{", CloseBrace = "}",
  Comma = ",",
  CstringSigil = "c",
  CstringLiteral = "C String Literal",
  StringLiteral = "String Literal",
  Semicolon = ";",
  CharLiteral = "Character Literal",
  WholeNumber = "Whole Number", Float = "Float",
  End = "End of File"
};

export type ReservedWord =
  "let"
  | "mut"
  | "funct"
  | "macro"
  | "extern"
  | "result"
  | "Typename"
  | "varargs"
  | PrimitiveType
  | Nothing;

export const reservedWords = [
  "let", "mut", "funct", "macro", "extern", "result", "Typename", "varargs",
  ...primitiveTypes, "Nothing"
];

export const punctuation = [
  "(", ")", ":-", ":", "-", "=>", "=", "{", "}", ",", ";"
];

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

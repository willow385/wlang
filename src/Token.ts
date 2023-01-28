enum TokenType {
  ReservedWord,
};

type ReservedWord =
  "let"
  | "funct"
  | "macro"
  | "extern"
  | "result"
  | "varargs";

export interface Token {
  type: TokenType,
  token: string
};

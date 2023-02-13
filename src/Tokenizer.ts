import { NumberToken, punctuation, reservedWords, Token, TokenType } from "./Token";

const isNumeric = (c: string | null) => c !== null && c >= '0' && c <= '9';

const isHexadecimal =
  (c: string | null) => isNumeric(c) || c !== null && c.toLowerCase() >= 'a' && c.toLowerCase() <= 'f';

const whitespace = [' ', '\t', '\n', '\r'];

export class Tokenizer {
  readonly sourceCode: string;
  private index: number;
  private currentChar: string | null;
  currentLineIndex: number;

  constructor(sourceCode: string) {
    this.sourceCode = sourceCode;
    this.index = 0;
    this.currentLineIndex = 0;
    this.currentChar = this.sourceCode[0];
  }

  getCurrentLine(): string {
    return `on line ${this.currentLineIndex+1}: \`${this.sourceCode.split('\n')[this.currentLineIndex]}\``;
  }

  private advance() {
    this.index++;
    if (this.index >= this.sourceCode.length) {
      this.currentChar = null;
    } else {
      this.currentChar = this.sourceCode[this.index];
    }
    if (this.currentChar === '\n') {
      this.currentLineIndex++;
    }
  }

  private peekNext(): string | null {
    if (this.index >= this.sourceCode.length) {
      return null;
    } else {
      return this.sourceCode[this.index + 1];
    }
  }

  private skipWhitespace() {
    while (this.currentChar !== null && whitespace.includes(this.currentChar)) {
      this.advance();
    }
  }

  private parseNumber(): NumberToken {
    let result: string = "";
    if (this.currentChar === '0' && this.peekNext() === 'x') {
      while (isHexadecimal(this.currentChar) || this.currentChar as string === 'x') {
        result += this.currentChar;
        this.advance();
      }
      return {
        type: TokenType.WholeNumber,
        value: BigInt(result)
      };
    } else if (isNumeric(this.currentChar)) {
      while (isNumeric(this.currentChar) || this.currentChar === '.') {
        result += this.currentChar;
        this.advance();
      }
      if (result.includes('.')) {
        return {
          type: TokenType.Float,
          value: parseFloat(result)
        };
      } else {
        return {
          type: TokenType.WholeNumber,
          value: BigInt(result)
        };
      }
    } else {
      throw new Error("");
    }
  }

  private skipComment() {
    if (this.currentChar !== '/') return;
    if (this.peekNext() === '/') {
      while (this.currentChar as string !== '\n') {
        this.advance();
      }
    } else if (this.peekNext() === '*') {
      this.advance();
      this.advance();
      while (!(this.currentChar as string === '*' && this.peekNext() === '/')) {
        this.advance();
      }
      this.advance();
      this.advance();
    } else {
      throw new Error("Syntax error: comments have to start with either '//' or '/*'");
    }
  }

  private parseIdentifier(): Token {
    let result = "";
    if (!/^[a-zA-Z]$/.test(this.currentChar ?? "")) {
      throw new Error("Syntax error: identifiers have to start with a letter");
    }
    while (/^[a-zA-Z0-9_]$/.test(this.currentChar ?? "")) {
      result += this.currentChar;
      this.advance();
    }
    return {
      type: TokenType.Identifier,
      value: result
    };
  }

  private parseStringLiteral(): Token {
    let result = "";
    if (this.currentChar !== '"') {
      throw new Error("Syntax error: string literal must start with a quote (\")");
    }
    this.advance();
    while (this.currentChar !== '"' && this.currentChar !== null) {
      result += this.currentChar;
      this.advance();
    }
    if (this.currentChar === null) {
      throw new Error("Syntax error: unterminated string literal");
    }
    this.advance();
    return {
      type: TokenType.StringLiteral,
      value: result
    };
  }

  private parseCstringLiteral(): Token {
    if (this.currentChar !== 'c') {
      throw new Error("Syntax error: cstring literal must start with the prefix c");
    }
    this.advance();
    const stringLiteral = this.parseStringLiteral();
    return {
      type: TokenType.CstringLiteral,
      value: stringLiteral.value as string
    };
  }

  private parsePunctuation(): Token {
    if (this.currentChar === ':') {
      if (this.peekNext() === '-') {
        this.advance();
        this.advance();
        return { type: TokenType.ColonDash, value: ":-" };
      } else {
        this.advance();
        return { type: TokenType.Colon, value: ":" };
      }
    } else if (this.currentChar === TokenType.OpenParen) {
      this.advance();
      return { type: TokenType.OpenParen, value: "(" };
    } else if (this.currentChar === TokenType.CloseParen) {
      this.advance();
      return { type: TokenType.CloseParen, value: ")" };
    } else if (this.currentChar === TokenType.Minus) {
      this.advance();
      return { type: TokenType.Minus, value: "-" };
    } else if (this.currentChar === '=') {
      if (this.peekNext() === '>') {
        this.advance();
        this.advance();
        return { type: TokenType.Arrow, value: "=>" };
      } else {
        this.advance();
        return { type: TokenType.Equals, value: "=" };
      }
    } else if (this.currentChar === TokenType.OpenBrace) {
      this.advance();
      return { type: TokenType.OpenBrace, value: "{" };
    } else if (this.currentChar === TokenType.CloseBrace) {
      this.advance();
      return { type: TokenType.CloseBrace, value: "}" };
    } else if (this.currentChar === TokenType.Semicolon) {
      this.advance();
      return { type: TokenType.Semicolon, value: ";" };
    } else if (this.currentChar === TokenType.Comma) {
      this.advance();
      return { type: TokenType.Comma, value: "," };
    } else if (this.currentChar === TokenType.QuestionMark) {
      this.advance();
      return { type: TokenType.QuestionMark, value: "?" };
    } else {
      throw new Error(
        `Syntax error: unexpected character '${this.currentChar}'\n`
        + `on line ${this.currentLineIndex+1}: ${this.sourceCode.split('\n')[this.currentLineIndex]}`
      );
    }
  }

  private parseInlineCBlock(): Token {
    // We're right at the first character of a `#{` if we get here, so we advance twice to skip it.
    this.advance();
    this.advance();
    let result = "";
    while (!(this.currentChar === "}" && this.peekNext() === "#")) {
      if (this.currentChar === null) {
        throw new Error(
          "Syntax error: unexpected end of file in inline C block\n"
          + this.getCurrentLine()
        );
      }
      result += this.currentChar;
      this.advance();
    }
    // Skip past the `}#` at the end.
    this.advance();
    this.advance();
    return {
      type: TokenType.InlineCBlock,
      value: result
    };
  }

  private advanceToNextToken(): Token {
    while (this.currentChar !== null) {
      if (this.currentChar === TokenType.Octothorpe && this.peekNext() === '{') {
        return this.parseInlineCBlock();
      } else if (this.currentChar === TokenType.CstringSigil && this.peekNext() === '"') {
        return this.parseCstringLiteral();
      } else if (/^[a-zA-Z]$/.test(this.currentChar)) {
        return this.parseIdentifier();
      } else if (whitespace.includes(this.currentChar)) {
        this.skipWhitespace();
      } else if (isNumeric(this.currentChar)) {
        return this.parseNumber();
      } else if (this.currentChar === '/' && ['/', '*'].includes(this.peekNext() ?? "")) {
        this.skipComment();
      } else if (this.currentChar === '"') {
        return this.parseStringLiteral();
      } else if (punctuation.includes(this.currentChar)) {
        return this.parsePunctuation();
      } else {
        throw new Error(
          `Syntax error: unexpected character '${this.currentChar ?? "EOF"}'\n`
          + this.getCurrentLine()
        );
      }
    }
    return {
      type: TokenType.End,
      value: "eof"
    };
  }

  getNextToken(): Token {
    const token = this.advanceToNextToken();
    if (token.type === TokenType.Identifier && reservedWords.includes(token.value)) {
      return { type: TokenType.ReservedWord, value: token.value };
    } else {
      return token;
    }
  }

  tokenize(): Token[] {
    let result = [];
    do {
      result.push(this.getNextToken());
    } while (result.at(-1)!.type !== TokenType.End);
    return result;
  }
};

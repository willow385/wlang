import { NumberToken, Token, TokenType } from "./Token";

const isNumeric = (c: string | null) => c !== null && c >= '0' && c <= '9';

const isHexadecimal =
  (c: string | null) => isNumeric(c) || c !== null && c.toLowerCase() >= 'a' && c.toLowerCase() <= 'f';

const whitespace = [' ', '\t', '\n', '\r'];

export class Tokenizer {
  private sourceCode: string;
  private index: number;
  private currentChar: string | null;
  private currentLine: number;

  constructor(sourceCode: string) {
    this.sourceCode = sourceCode;
    this.index = 0;
    this.currentLine = 0;
    this.currentChar = this.sourceCode[0];
  }

  advance() {
    this.index++;
    if (this.index >= this.sourceCode.length) {
      this.currentChar = null;
    } else {
      this.currentChar = this.sourceCode[this.index];
    }
    if (this.currentChar === '\n') {
      this.currentLine++;
    }
  }

  peekNext(): string | null {
    if (this.index >= this.sourceCode.length) {
      return null;
    } else {
      return this.sourceCode[this.index + 1];
    }
  }

  skipWhitespace() {
    while (this.currentChar !== null && whitespace.includes(this.currentChar)) {
      this.advance();
    }
  }

  parseNumber(): NumberToken {
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

  skipComment() {
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
  

  parseIdentifier(): Token {
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

  getNextToken(): Token {
    while (this.currentChar !== null) {
      if (/^[a-zA-Z]$/.test(this.currentChar)) {
        return this.parseIdentifier();
      } else if (whitespace.includes(this.currentChar)) {
        this.skipWhitespace();
      } else if (isNumeric(this.currentChar)) {
        return this.parseNumber();
      } else if (this.currentChar === '/' && ['/', '*'].includes(this.peekNext() ?? "")) {
        this.skipComment();
      } else {
        throw new Error(
          `Syntax error: unexpected character ${this.currentChar ?? "EOF"}`
          + ` on line ${this.currentLine}`
        );
      }
    }
    return {
      type: TokenType.End,
      value: "eof"
    };
  }

  tokenize(): Token[] {
    let result = [];
    do {
      result.push(this.getNextToken());
    } while (result.at(-1)!.type !== TokenType.End);
    return result;
  }
};

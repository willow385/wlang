import {
  Block,
  CstringLiteral,
  Expression,
  Extern,
  FloatLiteral,
  FunctionCall,
  FunctionDeclaration,
  IntLiteral,
  Module,
  ParamDeclaration,
  ResultStatement,
  Statement,
  StringLiteral
} from "./Ast";
import { literalTypes, Token, TokenType } from "./Token";
import { Tokenizer } from "./Tokenizer";
import {
  FunctionType,
  Mut,
  NullablePointerType,
  Parameter,
  ParameterList,
  PointerType,
  PrimitiveType,
  primitiveTypes,
  ValueType
} from "./Types";

export class Parser {
  private tokenizer: Tokenizer;
  private currentToken: Token;

  constructor(sourceCode: string) {
    this.tokenizer = new Tokenizer(sourceCode);
    this.currentToken = this.tokenizer.getNextToken();
  }

  consumeToken(tokenType: TokenType, value?: string | bigint | number) {
    if (this.currentToken.type === tokenType) {
      if (value !== undefined && this.currentToken.value !== value) {
        throw new Error(
          `Syntax Error: Expected \`${value.toString()}\`, got \`${this.currentToken.value.toString()}\`\n`
          + this.tokenizer.getCurrentLine()
        );
      }
      this.currentToken = this.tokenizer.getNextToken();
    } else {
      throw new Error(
        `Syntax Error: Expected \`${tokenType}\`, got \`${this.currentToken.type}\`\n`
        + this.tokenizer.getCurrentLine()
      );
    }
  }

  parseModule(): Module {
    let functionDeclarations: FunctionDeclaration[] = [];
    while (this.currentToken.type !== TokenType.End) {
      functionDeclarations.push(this.parseFunctionDeclaration());
    }
    return {
      type: "Module",
      functions: functionDeclarations
    };
  }

  parseFunctionDeclaration(): FunctionDeclaration {
    // First, we get the identifier of the function, for example "printf".
    this.consumeToken(TokenType.ReservedWord, "let");
    const identifier = this.currentToken.value.toString();
    this.consumeToken(TokenType.Identifier);
    this.consumeToken(TokenType.Colon);
    this.consumeToken(TokenType.ReservedWord, "funct");
    this.consumeToken(TokenType.OpenParen);
    // Now we get the list of named parameters to the function.
    let parameters: ParamDeclaration[] = [];
    while (this.currentToken.type !== TokenType.CloseParen) {
      if (this.currentToken.type === TokenType.ReservedWord) {
        this.consumeToken(TokenType.ReservedWord, "varargs");
        parameters.push("varargs");
      } else {
        // First the identifier of the parameter...
        const paramIdentifier = this.currentToken.value.toString();
        this.consumeToken(TokenType.Identifier);
        this.consumeToken(TokenType.Colon);
        // ...then its type.
        const paramType = this.parseValueType();
        parameters.push({ [paramIdentifier]: paramType });
        // If there's a comma, expect another parameter, else expect a closing parenthesis.
        if (this.currentToken.type === TokenType.Comma) {
          this.consumeToken(TokenType.Comma);
        } else if (this.currentToken.type as TokenType !== TokenType.CloseParen) {
          throw new Error(
            "Syntax error: closing parenthesis expected in parameter list\n"
            + this.tokenizer.getCurrentLine()
          );
        }
      }
    }
    this.consumeToken(TokenType.CloseParen);
    this.consumeToken(TokenType.Arrow);
    // Now the function's return type.
    const returnType = this.parseValueType();
    this.consumeToken(TokenType.Equals);
    let body: Block | Extern | null = null;
    // Then the function's body, or if it doesn't have one, "extern".
    // A function with "extern" instead of a body is supposed to be defined in a linked object file.
    if (this.currentToken.type as TokenType === TokenType.ReservedWord) {
      this.consumeToken(TokenType.ReservedWord, "extern");
      body = { type: "Extern", value: "extern" };
    } else {
      body = this.parseBlock();
    }
    // A function declaration is just a special case of a "let" statement, so it needs a semicolon.
    this.consumeToken(TokenType.Semicolon);
    // Now we leverage the power of Typescript to statically generate the function's type signature.
    const toParameter = (p: ParamDeclaration): Parameter =>
      p !== "varargs" ?
        Object.values(p)[0]
        : p;
    const toParameterList = (p: Parameter[]): ParameterList<any> => p.join(", ") as ParameterList<any>;
    const parameterList: ParameterList<any> = toParameterList(parameters.map(toParameter));
    const signature: FunctionType<any, any> = `funct(${parameterList}) => ${returnType}`;
    return {
      type: "FunctionDeclaration",
      identifier,
      signature,
      parameters,
      returnType,
      body
    };
  }

  parseValueType(): ValueType {
    const makeMut = (T: ValueType): Mut<typeof T> => `mut ${T}`;
    const makePtr = (T: ValueType): PointerType<typeof T> => `ptr :- ${T}`;
    const makeNullable = (T: ValueType): NullablePointerType<typeof T> => `ptr? :- ${T}`;
    if (this.currentToken.value === "mut") {
      this.consumeToken(TokenType.ReservedWord, "mut");
      return makeMut(this.parseValueType()); // recursion :3
    } else if (this.currentToken.value === "ptr") {
      this.consumeToken(TokenType.ReservedWord, "ptr");
      let nullable: boolean = false;
      if (this.currentToken.type as TokenType === TokenType.QuestionMark) {
        this.consumeToken(TokenType.QuestionMark);
        nullable = true;
      }
      this.consumeToken(TokenType.ColonDash);
      if (nullable) {
        return makeNullable(this.parseValueType());
      } else {
        return makePtr(this.parseValueType());
      }
    } else if ((primitiveTypes as string[]).includes(this.currentToken.value.toString())) {
      const type: PrimitiveType = this.currentToken.value as PrimitiveType;
      this.consumeToken(TokenType.ReservedWord, type);
      return type;
    } else {
      throw new Error(
        `Syntax error: expected type, got ${this.currentToken.value} instead`
        + this.tokenizer.getCurrentLine()
      );
    }
  }

  parseBlock(): Block {
    this.consumeToken(TokenType.OpenBrace);
    let statements: Statement[] = [];
    while (this.currentToken.type !== TokenType.CloseBrace) {
      statements.push(this.parseStatement());
    }
    this.consumeToken(TokenType.CloseBrace);
    return {
      type: "Block",
      value: statements
    };
  }

  parseStatement(): Statement {
    let result: Statement | null = null;
    if (this.currentToken.type === TokenType.ReservedWord) {
      result = this.parseResultStatement();
    } else {
      result = {
        type: "Statement",
        body: this.parseExpression()
      };
    }
    this.consumeToken(TokenType.Semicolon);
    return result;
  }

  parseExpression(): Expression {
    let result = null;
    if (literalTypes.includes(this.currentToken.type)) {
      switch (this.currentToken.type) {
        case TokenType.WholeNumber:
          result = {
            type: "IntLiteral",
            value: this.currentToken.value.toString()
          } as IntLiteral;
          this.consumeToken(TokenType.WholeNumber);
          return result;
        case TokenType.Float:
          result = {
            type: "FloatLiteral",
            value: this.currentToken.value
          } as FloatLiteral;
          this.consumeToken(TokenType.Float);
          return result;
        case TokenType.CstringLiteral:
          result = {
            type: "CstringLiteral",
            value: this.currentToken.value
          } as CstringLiteral;
          this.consumeToken(TokenType.CstringLiteral);
          return result;
        case TokenType.StringLiteral:
          result = {
            type: "StringLiteral",
            value: this.currentToken.value
          } as StringLiteral;
          this.consumeToken(TokenType.StringLiteral);
          return result;
        default:
          throw new Error(
            "Something must be wrong with either the Typescript compiler or your Javascript engine, "
            + "because this should never happen."
          );
      }
    } else {
      return this.parseFunctionCall();
    }
  }

  parseFunctionCall(): FunctionCall {
    if (this.currentToken.type !== TokenType.Identifier) {
      throw new Error(
        `Syntax error: expected identifier, got \`${this.currentToken.value}\``
        + this.tokenizer.getCurrentLine()
      );
    }
    const identifier = this.currentToken.value;
    this.consumeToken(TokenType.Identifier);
    this.consumeToken(TokenType.OpenParen);
    let functionArguments: Expression[] = [];
    while (this.currentToken.type as TokenType !== TokenType.CloseParen) {
      functionArguments.push(this.parseExpression());
      if (this.currentToken.type as TokenType === TokenType.Comma) {
        this.consumeToken(TokenType.Comma);
      }
    }
    this.consumeToken(TokenType.CloseParen);
    return {
      type: "FunctionCall",
      value: `${identifier}()`,
      identifier,
      arguments: functionArguments
    };
  }

  parseResultStatement(): ResultStatement {
    this.consumeToken(TokenType.ReservedWord, "result");
    const expression = this.parseExpression();
    return {
      type: "ResultStatement",
      body: expression
    };
  }
};


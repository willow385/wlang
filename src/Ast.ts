import { FunctionType, Parameter, ValueType } from "./Types";

interface IAstNode {
  type: string
};

interface IExpression extends IAstNode {
  value: any
};

export interface Extern extends IAstNode, IExpression {
  type: "Extern",
  value: "extern"
};

export interface IntLiteral extends IAstNode, IExpression {
  type: "IntLiteral",
  value: string // because BigInt is not immediately serializable to JSON
};

export interface FloatLiteral extends IAstNode, IExpression {
  type: "FloatLiteral",
  value: number
};

export interface StringLiteral extends IAstNode, IExpression {
  type: "StringLiteral",
  value: string
};

export interface CstringLiteral extends IAstNode, IExpression {
  type: "CstringLiteral",
  value: string
};

export interface Block extends IAstNode, IExpression {
  type: "Block",
  value: Statement[]
};

interface NamedParamDeclaration {
  [identifier: string]: Parameter
};

export type ParamDeclaration = NamedParamDeclaration | "varargs";

export interface FunctionDeclaration extends IAstNode, IStatement {
  type: "FunctionDeclaration",
  identifier: string,
  signature: FunctionType<any, any>,
  parameters: ParamDeclaration[],
  returnType: ValueType,
  body: Block | Extern
};

export interface FunctionCall extends IAstNode, IExpression {
  type: "FunctionCall",
  value: `${string}()`,
  identifier: string, 
  arguments: Expression[]
};

export type Expression = IExpression | FunctionCall;

// This represents an expression followed by a semicolon.
interface IStatement extends IAstNode {
  type: string,
  body: Expression
};

export interface ResultStatement extends IAstNode, IStatement {
  type: "ResultStatement",
  body: Expression
};

export type Statement = IStatement | ResultStatement;

export interface Module extends IAstNode {
  type: "Module",
  functions: FunctionDeclaration[]
};

// example AST for a hello world program
const helloWorld: Module = {
  type: "Module",
  functions: [
    {
      type: "FunctionDeclaration",
      identifier: "printf",
      signature: "funct(ptr :- u8, varargs) => inative",
      parameters: [{"fmt": "ptr :- u8"}, "varargs"],
      returnType: "inative",
      body: { type: "Extern", value: "extern" }
    },
    {
      type: "FunctionDeclaration",
      identifier: "main",
      signature: "funct(mut inative, mut ptr :- ptr :- u8) => inative",
      parameters: [{"argc": "mut inative"}, {"argv": "mut ptr :- ptr :- u8"}],
      returnType: "inative",
      body: {
        type: "Block",
        value: [
          {
            type: "Statement",
            body: {
              type: "FunctionCall",
              value: "printf()",
              identifier: "printf",
              arguments: [
                {
                  type: "StringLiteral",
                  value: "Hello, world!\\n"
                }
              ]
            }
          },
          {
            type: "ResultStatement",
            body: {
              type: "IntLiteral",
              value: "0"
            }
          }
        ]
      }
    }
  ]
};

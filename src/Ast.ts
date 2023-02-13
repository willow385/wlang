import { FunctionType, Parameter, ValueType } from "./Types";

interface IAstNode {
  type: string
};

interface IExpression extends IAstNode {
  type: ExpressionType,
  value: any
};

type ExpressionType =
  "Extern"
  | "IntLiteral"
  | "FloatLiteral"
  | "StringLiteral"
  | "CstringLiteral"
  | "Block"
  | "FunctionCall";

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

export type Statement = { type: "Statement", body: Expression } | ResultStatement;

export interface Module extends IAstNode {
  type: "Module",
  functions: FunctionDeclaration[]
};


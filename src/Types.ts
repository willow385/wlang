export type Pointer = "ptr";

export type Void = "void";

/* This type represents uninitialized or undefined values.
 * Reading an instance of Nothing is undefined behavior. */
export type Nothing = "Nothing";

export type PrimitiveType =
  | "inative" | "unative" // `int` and `unsigned int` in C
  | "i8"  | "u8"  | "i16" | "u16"
  | "i32" | "u32" | "i64" | "u64"
  | "float" | "double"
  | Void
  | Pointer;

export const primitiveTypes: PrimitiveType[] = [
  "inative", "unative", "i8", "u8", "i16", "u16", "i32", "u32", "i64", "u64", "float", "double",
  "void", "ptr"
];

export type Mut<T extends RuntimeType> = `mut ${T}`;

export type Typename = "Typename";

export type TypenameType<T extends RuntimeType> = `${Typename} :- ${T}`;

export type PointerType<T extends RuntimeType> = `${Pointer} :- ${T}`

export type NullPointerType = PointerType<Nothing>;

export type NullablePointerType<T extends RuntimeType> = PointerType<T> | NullPointerType;

type Parameter = ValueType | "varargs";

type ParameterList<Types extends Parameter[]> =
  Types extends [] ? ""
  : Types extends [infer T extends Parameter] ? `${T}`
  : Types extends [infer T extends ValueType, ...infer Next extends Parameter[]] ? `${T}, ${ParameterList<Next>}`
  : never;

export type FunctionType<Parameters extends Parameter[], ReturnType extends ValueType> =
  `funct(${ParameterList<Parameters>}) => ${ReturnType}`;

export type FunctionPointerType<Parameters extends Parameter[], ReturnType extends ValueType> =
  PointerType<FunctionType<Parameters, ReturnType>>;

export type ValueType =
  PrimitiveType
  | Mut<any>
  | PointerType<any>
  | Nothing;

export type ParametricType = TypenameType<any>;

export type RuntimeType = ValueType | FunctionType<any, any>;

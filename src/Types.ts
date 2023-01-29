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

export type Mut<T extends Type> = `mut ${T}`;

export type Typename<T extends Type> = `Typename :- ${T}`;

export type CompositeType<
  T extends Type,
  R extends Type
> = `${T} :- ${R}`;

export type PointerType<T extends Type> = CompositeType<Pointer, T>;

export type NullPointer = PointerType<Nothing>;

export type Type =
  PrimitiveType
  | Mut<any>
  | Typename<any>
  | CompositeType<any, any>
  | Nothing;

export type Pointer = "Ptr";

export type PrimitiveType =
  | "inative" | "unative"
  | "i8"  | "u8"  | "i16" | "u16"
  | "i32" | "u32" | "i64" | "u64"
  | "float" | "double" | "void"
  | Pointer;

export type Typename<T extends Type> = `Typename :- ${T}`;

export type CompositeType<
  T extends Type,
  R extends Type
> = `${T} :- ${R}`;

export type PointerType<T extends Type> = CompositeType<Pointer, T>;

export type Type = PrimitiveType | Typename<any> | CompositeType<any, any>;

import { Block, FunctionCall, FunctionDeclaration, Module, ResultStatement } from "./Ast";
import { integralTypes, Mut, NullablePointerType, PointerType, ValueType } from "./Types";

export function isPointer(type: ValueType): boolean {
  return type.includes("ptr");
}

export function isMut(type: ValueType): boolean {
  return type.startsWith("mut");
}

function decomposeType(type: ValueType): ValueType[] {
  return type.split(" :- ") as ValueType[];
}

function composeType(typeComponents: ValueType[]): ValueType {
  return typeComponents.join(" :- ") as ValueType;
}

function isNullable(type: ValueType): boolean {
  const parts = decomposeType(type);
  return parts[0].includes("ptr?");
}

// ptr :- T => T
function getTypePointedTo(
  pointerType: PointerType<ValueType> | NullablePointerType<ValueType>
): ValueType {
  return composeType(decomposeType(pointerType).slice(1));
}

// T => mut T
function asMut(type: ValueType): Mut<ValueType> {
  if (!isMut(type)) {
    return `mut ${type}`;
  } else {
    return type as Mut<ValueType>;
  }
}

// mut T => T
function asNonMut(type: ValueType): ValueType {
  if (isMut(type)) {
    return type.split(" ")[1] as ValueType;
  } else {
    return type;
  }
}

/* This function enforces type compatibility according to rules described in the
 * last paragraph of the readme. Future version of Wlang will have more sophisticated
 * type constraints, including interfaces, ownership, and explicit casting. */
function canImplicitlyCast(type: ValueType, otherType: ValueType): boolean {
  if (type === otherType) {
    // Identity property.
    return true;
  } else {
    if (!isMut(type) && isMut(otherType)) {
      console.error(
        `Cannot implicitly cast non-mutable type \`${type}\` to mutable type \`${otherType}\`.`
      );
      return false;
    } else if (isPointer(type) && !isPointer(otherType)) {
      console.error(
        `Cannot implicitly cast pointer type \`${type}\` to non-pointer type \`${otherType}\`.`
      );
      return false;
    } else if (isPointer(type)) {
      if (isNullable(type) && !isNullable(otherType)) {
        console.error(
          `Cannot implicitly cast nullable type \`${type}\` to non-nullable type \`${otherType}\`.`
        );
        return false;
      } else {
        // We've got two pointers with compatible mutability and nullability.
        // Now the real question: can the one actually be cast to the other?
        const typePointedTo = getTypePointedTo(type as PointerType<ValueType>);
        const otherTypePointedTo = getTypePointedTo(otherType as PointerType<ValueType>);
        if (typePointedTo === "void" || otherTypePointedTo === "void") {
          // A void pointer can always be cast if it has compatible nullability and mutability.
          return true;
        } else {
          if (isPointer(typePointedTo) && isPointer(otherTypePointedTo)) {
            // They're both pointers to pointers? Then we check their compatibility recursively.
            return canImplicitlyCast(typePointedTo, otherTypePointedTo);
          } else if (isPointer(typePointedTo) || isPointer(otherTypePointedTo)) {
            console.error(
              `Cannot implicitly cast \`${type}\` to \`${otherType}\`, because one points to a `
              + "pointer type, and the other does not."
            );
            return false;
          } else {
            // Neither of them are pointers? Then we recurse one more time.
            const result = canImplicitlyCast(typePointedTo, otherTypePointedTo);
            if (!result) {
              console.error(
                `Pointers to \`${typePointedTo}\` and \`${otherTypePointedTo}\` are incompatible.`
              );
            }
            return result;
          }
        }
      }
    } else {
      // If we get here, then `type` is not a pointer type.
      if (isPointer(otherType)) {
        console.error(
          `Cannot implicitly cast non-pointer type \`${type}\` to pointer type \`${otherType}\`.`
        );
        return false;
      } else {
        const result = asMut(type) === asMut(otherType);
        if (!result) {
          console.error(`Cannot implicitly cast \`${type}\` to \`${otherType}\`.`)
        }
        return result;
      }
    }
  }
}

// Table that maps function identifiers to their return types
interface FunctionTypeLookupTable {
  [identifier: string]: ValueType
};

function generateLookupTable(functions: FunctionDeclaration[]): FunctionTypeLookupTable {
  let result: FunctionTypeLookupTable = {};
  for (const functionDec of functions) {
    result[functionDec.identifier] = functionDec.returnType;
  }
  return result;
}

function isBlockResultTypeCompatible(
  block: Block,
  returnType: ValueType,
  lookupTable: FunctionTypeLookupTable
): boolean {
  if (block.value.length === 0 || block.value.at(-1)?.type !== "ResultStatement") {
    const result = returnType === "void";
    if (!result) {
      console.error("Non-void type was expected, but block does not end with a result statement.");
    }
    return result;
  } else {
    if (returnType === "void") {
      console.error("Cannot result a value from a void function.");
      return false;
    }
    const resultStatement = block.value.at(-1) as ResultStatement;
    if (resultStatement.body.type === "FunctionCall") {
      const functionCall = resultStatement.body as FunctionCall;
      if (!(functionCall.identifier in lookupTable)) {
        console.error(
          `Function \`${functionCall.identifier}\` was called but could not be found in scope. `
          + "Did you forget to declare it?"
        );
        return false;
      }
      const functionCallReturnType = lookupTable[functionCall.identifier];
      if (canImplicitlyCast(functionCallReturnType, asNonMut(returnType))) {
        return true;
      } else {
        console.error(
          `Type error: function \`${functionCall.identifier}\` returns \`${functionCallReturnType}\`, `
          + `which cannot be implicitly cast to \`${returnType}\`.`
        );
        return false;
      }
    } else if (resultStatement.body.type === "IntLiteral") {
      const result = integralTypes.includes(asNonMut(returnType) as any);
      if (!result) {
        console.error(`Cannot result integer literal from function returning \`${returnType}\`.`)
      }
      return result;
    } else if (resultStatement.body.type === "FloatLiteral") {
      const result = ["float", "double"].includes(asNonMut(returnType));
      if (!result) {
        console.error(`Cannot result float literal from function returning \`${returnType}\`.`)
      }
      return result;
    } else {
      console.error(
        "Version 0.1.2 of Wlang doesn't support returning expressions "
        + `of type \`${resultStatement.body.type}\`.`
      );
      return false;
    }
  }
}

export function isTypeSound(ast: Module): boolean {
  const lookupTable: FunctionTypeLookupTable = generateLookupTable(ast.functions);
  let result = true;
  for (const functionDec of ast.functions) {
    if (functionDec.body.type !== "Extern") {
      if (!isBlockResultTypeCompatible(functionDec.body, functionDec.returnType, lookupTable)) {
        console.error(`^ Type error in function \`${functionDec.identifier}\` described above.\n`);
        result = false;
      }
    }
  }
  return result;
}

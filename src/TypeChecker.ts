import { Block, Expression, FunctionCall, FunctionDeclaration, Module, ResultStatement } from "./Ast";
import { wlangCompilerVersion } from "./GlobalConstants";
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

function isFunctionCallValid(
  functionCall: FunctionCall,
  module: Module,
  lookupTable: FunctionTypeLookupTable
): boolean {
  const functionDec = module.functions.find(f => f.identifier === functionCall.identifier);
  if (functionDec === undefined) {
    console.error(`No function named \`${functionCall.identifier}\` could be found in scope.`);
    return false;
  }
  const arity = functionDec.parameters.length;
  const argumentCount = functionCall.arguments.length;
  if (arity === 0 && argumentCount === 0) {
    return true;
  }
  const hasVarargs = functionDec.parameters.includes("varargs");
  if (hasVarargs && argumentCount < (arity - 1)) {
    console.error(
      `Call to variadic function \`${functionDec.identifier}\` with signature `
      + `\`${functionDec.signature}\` must have at least ${(arity - 1)} arguments, `
      + `but only ${argumentCount} arguments were passed.`
    );
    return false;
  } else if (!hasVarargs && argumentCount !== arity) {
    const adverb = argumentCount < arity ? "only" : "as many as";
    console.error(
      `Call to function \`${functionDec.identifier}\` must have exactly ${arity} arguments, `
      + `but ${adverb} ${argumentCount} arguments were passed.`
    );
    return false;
  } else {
    let areArgumentsValid = true;
    for (let i = 0; i < arity && functionDec.parameters[i] !== "varargs"; i++) {
      const isArgumentValid = canImplicitlyCastExpression(
        functionCall.arguments[i],
        Object.values(functionDec.parameters[i])[0] as ValueType,
        module,
        lookupTable
      );
      if (!isArgumentValid) {
        areArgumentsValid = false;
        const invalidExpression =
          functionCall.arguments[i].type === "StringLiteral" ?
            `"${functionCall.arguments[i].value}"`
          : functionCall.arguments[i].type === "CstringLiteral" ?
            `c"${functionCall.arguments[i].value}"`
          : `${functionCall.arguments[i].value}`;
        console.error(
          `Expression \`${invalidExpression}\` cannot be implicitly cast `
          + `to expected type \`${Object.values(functionDec.parameters[i])[0]}\`.`
        );
      }
    }
    return areArgumentsValid;
  }
}

// This function checks whether `expression` can be implicitly cast to type `targetCastType`.
function canImplicitlyCastExpression(
  expression: Expression,
  targetCastType: ValueType,
  module: Module,
  lookupTable: FunctionTypeLookupTable
): boolean {
  if (targetCastType === "void") {
    console.error("Cannot cast a value to void.");
    return false;
  }

  switch (expression.type) {
    case "FunctionCall": {
      const functionCall = expression as FunctionCall;
      if (!(functionCall.identifier in lookupTable)) {
        console.error(
          `Function \`${functionCall.identifier}\` was called but could not be found in scope. `
          + "Did you forget to declare it?"
        );
        return false;
      }
      const functionCallReturnType = lookupTable[functionCall.identifier];
      if (canImplicitlyCast(functionCallReturnType, asNonMut(targetCastType))) {
        const result = isFunctionCallValid(functionCall, module, lookupTable);
        if (!result) {
          console.error(
            `Invalid arguments were passed to the function \`${functionCall.identifier}\`.`
          );
        }
        return result;
      } else {
        console.error(
          `Type error: function \`${functionCall.identifier}\` returns \`${functionCallReturnType}\`, `
          + `which cannot be implicitly cast to \`${targetCastType}\`.`
        );
        return false;
      }
    }
    case "IntLiteral": {
      const result = integralTypes.includes(asNonMut(targetCastType) as any);
      if (!result) {
        console.error(`Cannot implicitly cast integer literal to \`${targetCastType}\`.`);
      }
      return result;
    }
    case "FloatLiteral": {
      const result = ["float", "double"].includes(asNonMut(targetCastType));
      if (!result) {
        console.error(`Cannot implicitly cast float literal to \`${targetCastType}\`.`);
      }
      return result;
    }
    case "CstringLiteral": {
      const result = canImplicitlyCast("mut ptr :- i8", targetCastType);
      if (!result) {
        console.error(
          `Cannot implicitly cast cstring literal, which has type \`mut ptr :- i8\`, to ${targetCastType}.`
        );
      }
      return result;
    }
    default:
      console.error(
        `Expressions of type ${expression.type} are not supported in Wlang ${wlangCompilerVersion}.`
      );
      return false;
  }
}

function isBlockResultTypeCompatible(
  block: Block,
  returnType: ValueType,
  module: Module,
  lookupTable: FunctionTypeLookupTable
): boolean {
  if (block.value.length === 0 || block.value.at(-1)?.type !== "ResultStatement") {
    const result = returnType === "void";
    if (!result) {
      console.error("Non-void type was expected, but block does not end with a result statement.");
    }
    return result;
  } else {
    const resultStatement = block.value.at(-1) as ResultStatement;
    if (resultStatement.body.type === "CstringLiteral") {
      console.error("cstring literals cannot be directly returned from functions.");
      return false;
    } else {
      const result = canImplicitlyCastExpression(resultStatement.body, returnType, module, lookupTable);
      if (!result) {
        console.error(
          "Cannot result an expression from a function that can't be implicitly cast to that "
          + "function's return type."
        );
      }
      return result;
    }
  }
}

function isFunctionDeclarationTypeSound(
  functionDec: FunctionDeclaration,
  module: Module,
  lookupTable: FunctionTypeLookupTable
): boolean {
  if (functionDec.body.type === "Extern") {
    // Assume all extern functions are type sound.
    return true;
  }
  let result = true;
  if (!isBlockResultTypeCompatible(functionDec.body, functionDec.returnType, module, lookupTable)) {
    result = false;
  }
  /* If the function contains any function calls, we have to check that they're valid. */
  for (const statement of functionDec.body.value) {
    if (statement.body.type === "FunctionCall") {
      const functionCall = statement.body as FunctionCall;
      if (!isFunctionCallValid(functionCall, module, lookupTable)) {
        result = false;
      }
    }
  }
  return result;
}

export function isModuleTypeSound(module: Module): boolean {
  const lookupTable: FunctionTypeLookupTable = generateLookupTable(module.functions);
  let result = true;
  for (const functionDec of module.functions) {
    if (functionDec.body.type !== "Extern") {
      if (!isFunctionDeclarationTypeSound(functionDec, module, lookupTable)) {
        console.error(`^ Type error in function \`${functionDec.identifier}\` described above.\n`);
        result = false;
      }
    }
  }
  return result;
}

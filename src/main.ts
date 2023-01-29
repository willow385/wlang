import fs from "fs";
import { TokenType } from "./Token";
import { Tokenizer } from "./Tokenizer";
import {  } from "./Types";

function main(argv: string[]): void {
  const sourceCode = fs.readFileSync(argv[1], "ascii");
  const tokenList = new Tokenizer(sourceCode).tokenize();
  for (const token of tokenList) {
    console.log(`type: ${token.type}, value: ${token.value.toString()}`);
  }
}

main(process.argv.slice(1));

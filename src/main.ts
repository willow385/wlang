import fs from "fs";
import { Tokenizer } from "./Tokenizer";

function main(argv: string[]): void {
  const sourceCode = fs.readFileSync(argv[1], "ascii");
  const tokenList = new Tokenizer(sourceCode).tokenize();
  for (const token of tokenList) {
    console.log(`value: ${token.value.toString()}\t\ttype: ${token.type}`);
  }
}

main(process.argv.slice(1));

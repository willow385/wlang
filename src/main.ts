import fs from "fs";
import { Parser } from "./Parser";

function main(argv: string[]): void {
  const sourceCode = fs.readFileSync(argv[1], "ascii");
  const ast = new Parser(sourceCode).parseModule();
  console.log(JSON.stringify(ast, null, 2));
}

main(process.argv.slice(1));

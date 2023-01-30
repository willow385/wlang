import fs from "fs";
import { Module } from "./Ast";
import { compile } from "./CodeGen";
import { Parser } from "./Parser";

function main(argv: string[]): void {
  if (argv[1].endsWith(".wlg")) {
    const sourceCode = fs.readFileSync(argv[1], "ascii");
    try {
      const ast = new Parser(sourceCode).parseModule();
      if (argv.includes("--output-wlo")) {
        console.log(JSON.stringify(ast, null, 2));
      } else {
        const output = compile(ast);
        console.log(output);
      }
    } catch (error) {
      console.error((error as Error).message);
    }
  } else if (argv[1].endsWith(".wlo.json")) {
    const objectCode = fs.readFileSync(argv[1], "ascii");
    try {
      const ast = JSON.parse(objectCode) as Module;
      const output = compile(ast);
      console.log(output);
    } catch (error) {
      console.error((error as Error).message);
    }
  } else {
    console.error("User error: you have to pass a *.wlg or *.wlo.json file as the first argument.");
  }
}

main(process.argv.slice(1));

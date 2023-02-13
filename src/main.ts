import fs from "fs";
import { Parser } from "./Parser";
import { Module } from "./Ast";
import { compile } from "./CodeGen";
import { wlangCompilerVersion } from "./GlobalConstants";

function main(argv: string[]): void {
  if (argv.includes("--version")) {
    console.log(
      `Wlang compiler ${wlangCompilerVersion}, release date 12 Feb 2023\n`
      + "Copyright (C) 2023 Willow Falzone.\n"
      + "All rights reserved under the BSD 2-clause license.\n"
      + "For more info see the LICENSE in this project's root directory."
    );
  } else if (argv[1].endsWith(".wlg")) {
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

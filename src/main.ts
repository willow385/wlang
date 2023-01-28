import {  } from "./Types";

function main(argv: string[]): void {
  argv.forEach(a => console.log(a));
}

main(process.argv.slice(2));

// The goal for version 0.1.1 is to be able to compile this WLang program.

let printf: funct(fmt: ptr :- u8, varargs) => inative = extern;

let main: funct(argc: mut inative, argv: mut ptr :- ptr :- u8) => inative = {
  printf(c"Hello, world!\n");
  result 0;
};

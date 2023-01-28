let printf: funct(fmt: cstring, varargs) => inative = extern;

let main: funct(argc: mut inative, argv: mut cstring[]) => inative = {
  printf(c"Hello, world!\n");
  result 0;
};

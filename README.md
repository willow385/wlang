# Wlang
a language that compiles to C


It's pronounced like "wuh-lang", or /wə.ˈle͡ɪŋ/ in IPA.


After installing dependencies with `npm install`, you can compile the Wlang compiler
with `npm run build`, and then invoke it with `npm run main <file>.wlg`. It will compile
Wlang into C and then print the C to stdout. You can then redirect that to a file and
compile it with your C compiler of choice.


The `extern` keyword will generate a function declaration without generating an implementation,
which allows you to link to functions from the C standard library and other binary object
files. If you do use this to link to C standard library functions, for example if you do this:
```
let malloc: funct(s: size) => mut ptr? :- mut void = extern;
```
the Wlang compiler will produce this:
```c
void* malloc(const size_t s);
```
which should indeed bring `malloc` into scope in a legally well-defined manner, and thereby
enable you to call `malloc` in Wlang code.


`*.wlg` is the extension for Wlang source code, and `*.wlo.json` is the extension for what
I call "Wlang object files", hence `wlo` for `Wlang object`. These are distinct from regular
object files, which are of course compiled from Assembly. You can generate your own by
running the compiler with `npm run main -- <file>.wlg --output-wlo` and piping the output
to a `*.wlo.json` file. Don't forget the `--` after `npm run main` or npm will eat the flag.


My reasoning for why you'd want to use Wlang object files for incremental compilation 
instead of binary object files is that Wlang has more type information that the compiler 
can reason about than C does, for example it already distinguishes between nullable and 
non-nullable pointers, which C does not. It will of course always be possible to compile 
Wlang into a regular binary object file, and then link other Wlang programs (or C 
programs, for that matter) to it through the `extern` keyword. But if you do that, the 
responsibility for checking that the function's type signatures actually match is no 
longer possible for the compiler to uphold, and instead falls to the programmer.

So, if you want to call Wlang functions in C, then by all means, compiling to a binary
object file and linking against it per usual is absolutely the right way to go. But if you're
only going to call Wlang functions from Wlang, it'd be easier to use Wlang object files,
and forgo machine code generation altogether until it comes time to make the actual executable.

## Changes by version
### v0.1.2
Version 0.1.2 adds very basic type checking to the language. Before it compiles your program,
it will check to make sure that all functions return values compatible with their return types,
and if it finds any functions for which that isn't the case, it will refuse to compile your
program and print a helpful error message to stderr. The type checker is more sophisticated than
just comparing types according to string equality; it enforces the following rules concerning
implicit casting:

0. A type `T` cannot be cast to any non-`T` type. (This will be revised in later versions.)
1. A `mut T` can be cast to `T`, but a `T` cannot be cast to `mut T`.
2. A `ptr :- T` can be cast to a `ptr? :- T`, but a `ptr? :- T` cannot be cast to a `ptr :- T`.
   In other words, a non-nullable pointer can be cast to a nullable pointer, but not the other way around.
3. `ptr :- void` breaks rule 0, but not rules 1 and 2.
4. `ptr :- void` is the only pointer type that can be cast as a different pointer type.

### v0.1.3
Version 0.1.3 adds slightly more advanced type checking: in addition to the above, it will check
to make sure that all function calls in your program agree with their declarations in arity and
type. So if you declare a function like this:
```
let printf: funct(fmt: mut ptr :- i8, varargs) => mut inative = extern;
```
then these calls are valid:
```
printf(c"Hello, world!\n");
printf(c"The magic number is %d\n", 69);
```
but not this one:
```
// Expression `3.14` cannot be implicitly cast to expected type `mut ptr :- i8`
printf(3.14);
```
If the type checker finds that a call is invalid, it will print an error message to stderr and
won't compile your program.

### v0.1.4
This version is not complete. When finished, it will implement variable declaration, variable
assignment, and inline C (by which I mean literally embedding C source code in Wlang source code,
like inline assembly).

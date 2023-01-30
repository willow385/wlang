# wlang
a language that compiles to C

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
void*  malloc(const size_t s);
```
which should indeed bring `malloc` into scope in a legally well-defined manner, and thus you
can call `malloc` in Wlang code.


`*.wlg` is the extension for Wlang source code, and `*.wlo.json` is the extension for what
I call "Wlang object files", hence `wlo` for `Wlang object`. These are distinct from regular
object files, which are of course compiled from Assembly. You can generate your own by
running the compiler with `npm run main -- <file>.wlg --output-wlo` and piping the output
to a file. Don't forget the `--` after `npm run main` or npm will eat the flag.


My reasoning for why you'd want to use Wlang object files versus binary object files is that Wlang
has more type information that the compiler can reason about than C does, for example it
already distinguishes between nullable and non-nullable pointers, which C does not. It will
of course always be possible to compile Wlang into a regular binary object file, and then
link other Wlang programs (or C programs, for that matter) to it through the `extern` keyword.
But if you do that, the responsibility for checking that the function's type signatures
actually match is no longer possible for the compiler to uphold, and instead falls to the
programmer.

So, if you want to call Wlang functions in C, then by all means, compiling to a binary
object file and linking against it per usual is absolutely the right way to go. But if you're
only going to call Wlang functions from Wlang, it'd be easier to use Wlang object files,
and forgo machine code generation altogether until it comes time to make the actual executable.


Version 0.1.1 allows you to compile and run a hello world program, but the language is pretty
barebones in terms of semantics. There's an expressive static type system, but v0.1.1 doesn't
actually do much type checking; basic blunders like passing a `double` to a function expecting
a `char *` simply won't be caught. Variables are not yet supported, struct types are not yet
supported, etc. etc. Basically all you can do yet is declare functions and call functions,
which does make Wlang v0.1.1 Turing-complete, though not necessarily very practical.

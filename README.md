# wlang
a language with type-checked macros

After installing dependencies with `npm install`, you can parse Wlang source code
into an abstract syntax tree by doing `npm run main <file>.wlg`.

I made the file `wlang-code/hello.wlo.json` by piping the output of the above command
into that file. `*.wlg` is the extension for Wlang source code, and `*.wlo.json` is the extension
for what I personally think of as Wlang object files, hence `wlo` for `Wlang object`. These
are distinct from regular object files, which are of course compiled from Assembly.

My goal for version 0.1.1 of the compiler is to be able to compile `hello.wlg` into C. The
reasoning behind distinguishing Wlang object files from binary object files is that Wlang
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

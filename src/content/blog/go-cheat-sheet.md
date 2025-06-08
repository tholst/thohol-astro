---
title: Go Cheat Sheet
description: When the Go'ing gets tough, the tough get Go'ing
pubDate: 2020-02-11
updatedDate: 2020-05-27
---

Below are some notes on the Go language, for my personal reference.

**Disclaimer**: Most of the examples are adapted from Go's official guide - [A Tour of Go](https://tour.golang.org/).

## Structure

- Repository --> Module(s) --> Package(s)
- Package
  - is a collection of source files
  - compiled together
  - definitions (functions, types, variables, constants) are visible within package
- Module
  - is a collection of one or more related packages, specifically all packages contained in module root and subdirectories (unless it contains another `go.mod` file)
  - released together
  - defined by a `go.mod` file at module root; which declares the **module path**, the import path prefix for all packages within that module
  - the module path also serves as the download path
- Repository
  - is a collection of one (typically) or more modules
  - typically: repository root = module root

## Get started

### 1. Install

on MacOS :

```bash
$ brew install go
```

### Optional: Change Go workspace location

By default, Go will install packages to `$HOME/go`.

Set a different path, by setting the `GOPATH` environment variable in your shell configuration (`bash_profile` in my case):

```bash
# Setting workspace path for Go
export GOPATH=${HOME}/your/go/workspace
```

### 2. Create a HelloWorld module

```bash
$ mkdir HelloWorld
$ cd HelloWorld/
$ go mod init example.com/go/helloworld
go: creating new go.mod: module example.com/go/helloworld
```

### 3. Create your first Go file

1. create the `.go` source file

```bash
$ touch hello.go
```

2. The first line contains the package name. Assign it to package `main`, because executable files must always use `main`.

```go
package main
```

3. Add some code

```go
package main

import "fmt"

func main()  {
	fmt.Printf("hello, world\n")
}
```

## Language and Control Structures

### Package

```go
// package <name>
// name "main" for executable package
package main

// import statements
import "fmt"
import "math"

// equivalent factored import statements (suggested style)
import (
	"fmt"
	"math"
)


func main() {
	fmt.Printf("Now you have %g problems.\n", math.Sqrt(7))
}
```

#### Exports

Any function, constant or variable with a capital name is **exported** from the package. All others are not exported and therefore not accessible outside the package.

### Variables and Constants

#### Variable

```go
// declarations (need types)
var i int
var c, python, java bool // list of declarations

// declaration with initialization (with optional types)
var i, j int = 1, 2

// declaration with initialization (without types, they are inferred from the initializers)
var i, j = 1, 2
```

**Special Short Form (inside functions)**

```go
func main() {
	k := 3
    c, python, java := true, false, "no!"
    ...
}
```

#### Constants

```go
const Pi = 3.14
```

Numeric constants are high-precision values.
An untyped constant takes the type needed by its context. So potentially, untyped constants may store integers larger than 64-bit.

#### Default (uninitialized) values

The zero value is:

- `0` for numeric types,
- `false` for the boolean type, and
- `""` (the empty string) for strings.

#### Basic Types

- **bool**
- **string**
- Integer:
  - **int** (_usually 32 bits wide on 32-bit systems and 64 bits wide on 64-bit systems_)
  - int8
  - int16
  - int32
  - int64
  - uint (_usually 32 bits wide on 32-bit systems and 64 bits wide on 64-bit systems_)
  - uint8
  - uint16
  - uint32
  - uint64
  - uintptr (_usually 32 bits wide on 32-bit systems and 64 bits wide on 64-bit systems_)
  - byte // alias for uint8
  - **rune** // alias for int32, represents a Unicode code point
- Float:
  - float32
  - float64
- Complex:
  - complex64
  - complex128

### Function

```go

// function receives two integer parameters (note type is given after variable name) and returns one integer (given after parameter list and before curly braces / function block)
func add(x int, y int) int {
	return x + y
}

// types for parameters with same type need only be given once
func add(x, y int) int {
	return x + y
}

// a function can return multiple values
func passAlong(x, y int) (int, int) {
	return x,  y
}
func main() {
	a, b := passAlong(5, 7)
}

// return values may be named and act as variable declarations then
func split(sum int) (x, y int) {
	x = sum * 4 / 9
	y = sum - x
	return x, y
}

```

#### Naked Return (Questionable Style)

```go
// return statement without paramets will return named return values
func split(sum int) (x, y int) {
	x = sum * 4 / 9
	y = sum - x
	return
}
```

### For Loop

```go
// for <init stmt>;<cond expr>;<post stmt> {}
for i := 0; i < 10; i++ {
    sum += i
}
```

- `<init stmt>`:
  - the _init statement_ is executed before the first iteration
  - typically a variable declaration (often in short form `i := 0`)
  - variable only visible in for loop
  - the statement is optional
- `<cond expr>`:
  - the _condition expression_ is evaluated _before_ every iteration
  - loop will _stop_ once the condition evalues to _false_
  - optional, will the create infinite loop
  ```go
  for {
      ...
  }
  ```
- `<post stmt>`:
  - the post statement is executed at the end of every iteration
  - the statement is optional

### While Loop

Go does not have a while loop, but a for loop without init and post statement takes the role.

```go
func main() {
	sum := 1
	for sum < 1000 {
		sum += sum
	}
}
```

### IF

```go
if x > 5 {
    return 7 + x
} else {
    return 7 - x
}
```

**with optional short-form variable assignment**

Variable (`y` below) only accesible in if-statement

```go
if y := 27 * x; y > 55 {
    return y
}
```

### Switch

- implicit `break` after each case, no run-through as in other languages
- but order still matters, the first (top to bottom) matching case will be executed
- case values can be dynamic expressions and non-integer types
- variables may be declared that are then only accessible within switch statement

```go
switch os := runtime.GOOS; os {
	case "darwin":
		fmt.Println("OS X.")
	case "linux":
		fmt.Println("Linux.")
	default:
		// freebsd, openbsd,
		// plan9, windows...
		fmt.Printf("%s.\n", os)
	}
```

Switch statement may also be used without condition variable/value. The effect is a condition value of `true` compared against the case expression. This yields the same behavior as an if-else chain.

```go
switch {
    case x > 5:
        ...
    case x < 2:
        ...
    default:
        ...
}
```

### defer

Now something special. Using the `defer` keyword, a function call can be deferred until after the current (surrounding) function returns. Parameters to deferred functions are evaluated immediately though.

The following code will order a pizza after the day's work is done.

**LDFE** (LIFO) **order**: Deferring a function will push it onto a stack, subsequent deferred functions will be pushed on top. So the first function deferred will be the last one executed - last-in-first-out. **Last-deferred-first-executed**.

```go
func main() {
    defer orderPizza("XL")

    getSomeWorkDone()
}
```

Typical case for the use of `defer` are clean up operations.

```go
func CopyFile(dstName, srcName string) (written int64, err error) {
    src, err := os.Open(srcName)
    if err != nil {
        return
    }
    defer src.Close()

    dst, err := os.Create(dstName)
    if err != nil {
        return
    }
    defer dst.Close()

    return io.Copy(dst, src)
}
```

Behavior of deferred statements in 3 rules:

1. A deferred function's arguments are evaluated when the defer statement is evaluated (read: _when the function is deferred_, NOT _when the deferred function is executed_).
2. Deferred function calls are executed in Last In First Out order after the surrounding function returns.
3. Deferred functions may read and assign to the returning function's named return values. The following function will return `2`.
   ```go
   func c() (i int) {
       defer func() { i++ }()
       return 1
   }
   ```

### Panic and Recover

Calling `panic(panicValue)` inside a function F has the following effect:

1. Regular control flow is stopped (execution of function is stopped).
2. All deferred functions are executed regularly (LIFO stack).
3. Function F returns to its caller and acts like a call to `panic()` there (go back to 1.). If F is the main function, the programm will crash.

Calling `recover()` inside a function F has the following effect:

- In panic mode:
  1. The panic mode is stopped. When F returns, it will not have panicking effect on its caller.
  2. The call to `recover()` returns the `panicValue` from the call to `panic(panicValue)`.
- Not in panic mode:
  1. The call to `recover()` returns `nil`. It has no other effect.

Because `recover()` is used to handle an error and its resulting panic mode, a call to `recover()` only makes sense in deferred functions. Otherwise its execution will be skipped due to panic mode.

```go
func main() {
    defer func() {
        if r := recover(); r != nil {
            fmt.Println("Recovered: ", r)
        }
    }()

    dontPanic()
}

func dontPanic() {
    panic("don't panic!!")
}
```

### Pointers

```go
var i int = 742
var p *int = &i

fmt.Println(*p)
*p = 42 // i = 42
```

### Structs

```go
type Size struct {
	W int
	H int
}

var (
    s Size = Size{1280, 1024}
    s1 = Size{} // 0,0
    s2 = Size{W: 100} // 100,0
    pS = &Size{1280, 1024} // pointer to Size{1280, 1024}
)
s.W = 1920
fmt.Println(s)
```

With pointers

```go
type Size struct {
	W int
	H int
}

var s Size = Size{1280, 1024}
var p *Size = &s
(*p).W = 2560
p.H = 1440 // == (*p).W !!! implicit dereference before field accessed
```

### Arrays

```go
var a [3]int // array size is part of type -> no resize
a[0] = 0
a[1] = 1
a[2] = 2

var b [5]int = [5]int{0,1,2,3,4}
```

**Slices**

```go
c := b[2:5]    // slice range is [inclusive:exclusive]
fmt.Println(c) // [2 3 4] not 5

c[0] = 42      // a slice is actually a reference, not a copy!
fmt.Println(b) // b == [0 1 42 3 4]

// this
x1 := [3]int{0,1,2}
x1SliceRef := x1[0:3]
// is equivalent to this "slice literal"
x1SliceRef := []int{0,1,2}

// slice defaults
y := [3]int{0,1,2}
// equivalent slices
y[0:3]
y[0:]
y[:3]
y[:]
```

## Unit Testing

1. Create a file ending in `_test.go` in the same package as the code under test.
2. `import "testing"`
3. implement a function `func TestXxx (t *testing.T) {}` where `Xxx` is the name of the test case

## More

More to come. Maybe. [Stay tuned](https://pbs.twimg.com/media/DUyK5XCU0AAMrf0?format=jpg&name=small).

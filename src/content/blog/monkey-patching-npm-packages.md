---
title: Monkey Patching NPM Packages
description: Fixing packages when forking is not an option; using patch-package
pubDate: 2020-01-19
updatedDate: 
---

So, I recently found this bug in one of the NPM packages this blog depends on. It's a one-line fix, but fixing the code itself was the smallest problem. I came to realize that I needed to monkey patch the NPM package. (See below WHY this was needed and other approaches did not work.)

> A monkey patch is a way for a program to extend or modify supporting system software locally (affecting only the running instance of the program).
>
> Source: [Wikipedia](https://en.wikipedia.org/wiki/Monkey_patch)

After some research I found this neat tool called [**patch-package**](https://github.com/ds300/patch-package). Below I will outline the steps that I took in my case.

## Steps

### Setup (first time only)

1. Install `patch-package`:

    ```bash
    npm install patch-package
    ```

2. Call `patch-package` from the `postinstall` script in your `package.json`. It will then automatically be executed after `npm install` is run for your package. (This also means that the patch is not necessarily applied to checked-out code.)

    ```json
    "scripts": {
        "postinstall": "patch-package"
    }
    ```

### Step 1: Implement the fix

So, I found this small bug in the `mdx-loader` package. This fix is very simple. In the file `node_modules/mdx-loader/prism/index.js`, I needed to change the following line

```js
node.properties.className = parent.properties.className || [];
```

to this:

```js
parent.properties.className = parent.properties.className || [];
```

### Step 2: Extracting the patch

Run `npx patch-package` on the fixed package.

```bash
$ npx patch-package mdx-loader
npx: installed 211 in 8.119s
patch-package 6.2.0
• Creating temporary folder
• Installing mdx-loader@3.0.2 with npm
• Diffing your files with clean files
✔ Created file patches/mdx-loader+3.0.2.patch
```

As you can read from the output above, a new directory `patches` has been created with a new file `patches/mdx-loader+3.0.2.patch`.

Here is that file:

```diff
diff --git a/node_modules/mdx-loader/prism/index.js b/node_modules/mdx-loader/prism/index.js
index bb7540e..e38b5a8 100644
--- a/node_modules/mdx-loader/prism/index.js
+++ b/node_modules/mdx-loader/prism/index.js
@@ -46,7 +46,7 @@ module.exports = options => {

     let code = nodeToString(node);
     try {
-      node.properties.className = (parent.properties.className || [])
+      parent.properties.className = (parent.properties.className || [])
         .concat('language-' + normalizedLanguage);

       node.properties['data-language'] = normalizedLanguage

```

### Step 3: Commit patch file

```bash
$ git add patches/mdx-loader+3.0.2.patch

$ git commit -m "fix prismjs-support in mdx-loader"
[patchMdxLoader b21e7a0] fix prismjs-support in mdx-loader
 1 file changed, 13 insertions(+)
 create mode 100644 patches/mdx-loader+3.0.2.patch
```

## Why I needed the monkey patch

Normally, if you found a bug in one of your NPM dependencies, you would:

1. Fork the package's repository on Github.
2. Fix the bug in your fork.
3. Create a pull-request (with your fix) from your fork to the original repo ("*upstream*").
4. As long as the PR (from step 3) has not been merged yet: Replace the NPM dependency (pointing to the original repo) with your fork (pointing to your repo)
5. Change back to original (reverse of step 4) when/if PR (from step 3) gets merged.

I actually did step 1, step 2 and step 3 ([pull request](https://github.com/frontarm/mdx-util/pull/58)). But then I got to step 4 and the pull request had not yet been merged after a couple of days. 

### The problem
So I tried changing the dependency from the original package to my fork of that package. But NPM wouldn't install it. And here is why: 

It's due some specifics of the interplay between NPM and GitHub. See, the package `mdx-loader` (where I fixed the bug) is actually maintained in this repo: [github.com/frontarm/mdx-util](https://github.com/frontarm/mdx-util). And that repository actually contains 4 separately registered NPM packages, each in their own folder under `packages/`. 


```bash
$ tree mdx-util
mdx-util
├── ...
├── package.json
├── packages
│   ├── mdx-constant
│   │   ├── package.json
│   │   └── ...
│   ├── mdx-loader
│   │   ├── package.json
│   │   └── ...
│   ├── mdx-table-of-contents
│   │   ├── package.json
│   │   └── ...
│   └── mdx.macro
│   │   ├── package.json
│   │   └── ...
```

So, to change my dependency to my forked and fixed version of the package, I would have to be able to say: NPM, please install the package `mdx-loader` which can be found in the subdirectory `packages/mdx-loader` of my fork repository [github.com/tholst/mdx-util](https://github.com/tholst/mdx-util). Turns out, that is not possible with NPM, as can been seen in this [NPM issue on GitHub](https://github.com/npm/npm/issues/2974) that was closed (and locked) without solution.

Hence, I ended up with the `patch-package` approach described above.
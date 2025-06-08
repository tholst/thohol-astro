---
title: React Dev Environment
description: Setting up a development environment for react
pubDate: 2019-10-26
published: false
---

# Setting Up React Dev Environment

## Approach 1: via create-react-app

1. Install node.js (via homebrew): `brew install node`

1. Install NPM package globally (optional): `npm install -g create-react-app`
1. Create new project `my-app` (two options)

    1. Use global installation: `create-react-app my-app`

    **OR**

    2. Use `npx` command (_executes npm package binaries_): `npx create-react-app my-app`

1. Then you can `cd` into the project directory: `cd my-app`
1. Start local dev server: `npm start`

## Approach 2: manual setup

Below are my personal notes when following the instructions from [jscomplete.com/reactful](https://jscomplete.com/reactful).

### Create NPM Project

1. `mkdir my-app`
2. `cd my-app`
3. `npm init` (or potentially `npm init -y` to select defaults)

### Install Main dependencies

1. Install `express` web-server: `npm i express`

_Note:_ While the react and react-dom packages are not really needed in production because they get bundled into a single file, this guide assumes that you deploy your unbundled code to production and bundle things there. If you want to bundle things in development and push your bundled files to production, you can install these packages - and most of what's coming next - as development dependencies - with `-D` or `--save-dev`.

2. Install main `react` dependencies: `npm i react react-dom`
3. Install `webpack` module bundler: `npm i webpack webpack-cli`
4. Install `babel` transpiler: `npm i babel-loader @babel/core @babel/node @babel/preset-env @babel/preset-react`

**OR**

--> all of the above in one line:

`npm i express react react-dom webpack webpack-cli babel-loader @babel/core @babel/node @babel/preset-env @babel/preset-react`

### Install Dev Dependencies

_Note_ Install dependencies only for development environment with `-D` or `--save-dev`.

1. Install `node` wrapper `nodemon` which can automatically restart a node application when it detects file changes: `npm install --save-dev nodemon`
2. Install linter `eslint` with some `babel` and `react` specific addons: `npm i -D eslint babel-eslint eslint-plugin-react eslint-plugin-react-hooks`

    1. Create the eslint config file in the project's root directory: `touch .eslintrc.js`
    1. Start with the following content:

        ```
        module.exports = {
            parser: 'babel-eslint',
            env: {
                browser: true,
                commonjs: true,
                es6: true,
                node: true,
                jest: true,
            },
            plugins: ['react-hooks', 'react'],
            extends: ['eslint:recommended', 'plugin:react/recommended'],
            parserOptions: {
                ecmaVersion: 2018,
                ecmaFeatures: {
                impliedStrict: true,
                jsx: true,
                },
                sourceType: 'module',
            },
            rules: {
                // You can do your customizations here...
                // For example, if you don't want to use the prop-types package,
                // you can turn off that recommended rule with: 'react/prop-types': ['off']
            },
        };
        ```

3. Consider installing [prettier](https://prettier.io/)
4. Install `jest` testing library: `npm i -D jest babel-jest react-test-renderer`

**OR**

1. all of the above in one line: `npm install --save-dev nodemon eslint babel-eslint eslint-plugin-react eslint-plugin-react-hooks jest babel-jest react-test-renderer`
2. Create `.eslintrc` file (see steps above).

### Creating an Initial Directory Structure (optional)

Example:

```
my-app/
  dist/
    main.js
  src/
    index.js
    components/
      App.js
    server/
      server.js
```

### Configuring Webpack and Babel

1. Configure `babel` for JSX and modern JS.

    1. create babel config file in project's root directory: `touch babel.config.js`
    1. start with the following content (`preset-env` for modern JS, `preset-react` for JSX):

    ```
    module.exports = {
        presets: ['@babel/preset-env', '@babel/preset-react'],
    };
    ```

2. Configure `webpack` to bundle application into single file:

    1. create webpack config file project's root directory: `touch webpack.config.js`

    1. start with the following content:

    ```
    module.exports = {
        module: {
            rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                loader: 'babel-loader',
                },
            },
            ],
        },
    };
    ```

    _Note:_ Webpack has certain defaults on which JavaScript file to start with. It looks for a `src/index.js` file. It'll also output the bundle to `dist/main.js` by default. If you need to change the locations of your `src` and `dist` files, you'll need a few more configuration entries in `webpack.config.js`.

### Creating NPM scripts for development

1. In `package.json`, in the `scripts` section, make the following changes:
    1. Make the `test` script use `jest`: `"test": "jest"`
    2. Add `dev-server` script that uses babel and nodemon: `"dev-server": "nodemon --exec babel-node src/server/server.js --ignore dist/"`
    3. Add `dev-bundle` script to run webpack: `"dev-bundle": "webpack -wd"`

All in all:

```
"scripts": {
    "test": "jest",
    "dev-server": "nodemon --exec babel-node src/server/server.js --ignore dist/",
    "dev-bundle": "webpack -wd"
  }
```

### Test the setup

_copied from article above:_

At this point, you are ready for your own code. If you followed the exact configurations above, you'll need to place your ReactDOM.render call (or .hydrate for SSR code) in src/index.js and serve dist/main.js in your root HTML response.

Here is a sample server-side ready React application that you can test with:

**src/components/App.js**

```
import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div>
      This is a sample stateful and server-side
      rendered React application.
      <br />
      <br />
      Here is a button that will track
      how many times you click it:
      <br />
      <br />
      <button onClick={() => setCount(count + 1)}>{count}</button>
    </div>
  );
}
```

**src/index.js**

```
import React from 'react';
import ReactDOM from 'react-dom';

import App from './components/App';

ReactDOM.hydrate(
  <App />,
  document.getElementById('mountNode'),
);
```

**src/server/server.js**

```
import express from 'express';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import App from '../components/App';

const server = express();
server.use(express.static('dist'));

server.get('/', (req, res) => {
  const initialMarkup = ReactDOMServer.renderToString(<App />);

  res.send(`
    <html>
      <head>
        <title>Sample React App</title>
      </head>
      <body>
        <div id="mountNode">${initialMarkup}</div>
        <script src="/main.js"></script>
      </body>
    </html>
  `)
});

server.listen(4242, () => console.log('Server is running...'));
```

That's it. If you run both npm dev-server and dev-bundle scripts (in 2 separate terminals):

```
$ npm run dev-server
$ npm run dev-bundle
```

Then open up your browser on http://localhost:4242/, you should see the React application rendered. This application should also be rendered if you disable JavaScript in your browser!
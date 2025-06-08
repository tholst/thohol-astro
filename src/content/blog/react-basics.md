---
title: React Basics
description: My reminder notes for react's basic concepts
pubDate: 2019-10-30
updatedDate: 2020-01-09
published: false
---

# React Basics

## JSX

React uses its own JavaScript-based language to support writing HTML in JavaScript. This language is called **JSX**. Before react code can be executed in a browser it has to be _transpiled from JSX to standard-JS_. Therefore, any react project that is using JSX will require a transpiler such as **[babel]**. While this can create some headache upfront, it comes with the advantage that react apps can be written with _modern JavaScript_, i.e., the latest JavaScript features that may not yet be supported by all major browsers.

**JSX example**

```jsx
function HelloWorld() {
    return <h1>Hello World</h1>;
}

ReactDOM.render(<HelloWorld />, document.getElementById("rootNode"));
```

**transpiled into** (calls to react functions in standard JavaScript)

```js
function HelloWorld() {
    return React.createElement("h1", null, "Hello World");
}

ReactDOM.render(
    React.createElement(HelloWorld, null),
    document.getElementById("rootNode")
);
```

## Architecture of applications built with react

### Key Concepts

-   A **react application** is a _tree of react components_
-   A **react component** is a _pure function_ (`model => ui`) that converts a model/state object into a piece of user interface (i.e., a subtree of elements in the DOM).
-   Unlike huge _UI framework_ like Angular, react calls itself a _library_ and is only responsible for UI rendering and event handling.
-   **One-way data binding**: React strictly uses only one direction of data binding, namely model-to-view (`model -> view`). The reverse view-to-model direction (`model <- view`) is implemented via callback functions. Both, regular model data as well as callbacks, are implemented as properties of the given react component. (also see _one-way flow_ below)

## React Components

A react component at its core is a function that converts model/state into UI.
"All react components must act like pure functions with respect to their props."
This allows react to optimize rendering. If the props have not changed, then rendering can be skipped, because its output should be the same.

A _pure function_ is defined as a function with two properties (wikipedia).

1. Its return value is the same for the same arguments.
2. Its evaluation has no side-effects.

=> That means, a pure function is neither influenced-by nor does it create side-effects.

A react component can be implemented in two ways: **Function Components** and **Class Components**.

### Function Components

This is just a regular JavaScript function that receives its properties as input and returns UI in the form of React/HTML elements.

**Example**

```
function HelloWorld() {
	return <h1>Hello World</h1>;
}
```

### Class Components

This is a regular JavaScript class that defines a `render()` function that returns UI in the form of React/HTML elements. The components properties are available via `this.props`.

**Example**

```
class HelloWorld implements React.Component {
    render() {
	    return <h1>Hello World</h1>;
    }
}
```

## One-way flow of data

Because (1) react only uses one-way data binding, and (2) all react components must act as pure functions wrt their props, react applications behave in a way that can be described by the term _"one-way flow"_.

```
     "Model"                    React           React Rendering        Rendered DOM
                              Component         Optimization           in Browser

    _________
    | Props |  ------|
    ---------        |        __________        _ _ _ _ _ _ _ _        _______
                     +----->  | Render |  ----  | Virtual Dom |  --->  | DOM |
    _________        |        ----------        - - - - - - - -        -------
    | State |  ------|                                                    |
    ---------                                                             |
        A                                                                 V            Browser Events
        |                            Events change State                  |            on DOM trigger
        +-----------------------------------------------------------------+            state-changing
                                                                                       callbacks
```

1. A react component is essentially a _render_ function `state/properties => UI/DOM` which takes as input the state/properties and produce some piece of UI (i.e., a (sub-)tree of DOM nodes) as output. Because react component are pure functions they should always produce the same UI for the same input data.
2. Internally, react renders the DOM nodes into an internal data structure called the **virtual DOM** which is similar to the browser's own DOM tree. To optimize and perform as little actual DOM re-rendering as possible, react compares the virtual DOM between rendering and only triggers the actual browser-rendering for DOM nodes that need a change.
3. When the user interacts with the application in the browser (e.g., by clicking a button on the UI), a callback is called that changes the state of the application in such way that the next rendering cycle (which is triggered by the state change; starting at step 1. again) will produce the changes in the UI that are required in response (e.g., a menu opening in response to the button click). The callbacks for state changes are typically implemented in a central module close to the state definition. They are then passed as properties down to the react component that implements their call (e.g., by connecting it to the `onClick` event of a button.)

Because a react application is a tree of react components, we can also describe the one way flow of data as a one-way flow from the application's root component to the applications many leaf components. React's documentation says "The Data Flows Down" ("down" because the tree's root is imagined at the top with its children below).

```
    o      root             |
   / \                      |
  o   o    children         |  Data flows down
 / \   \                    |
o  o    o  leaves           V
```

The documentation says, '[t]his is commonly called a "top-down" or "unidirectional" data flow. Any state is always owned by some specific component, and any data or UI derived from that state can only affect components "below" them in the tree.'

## MVI Architecture (Model View Intent)

A react application typically

-   has a central state definition,
-   has central functions which implement state changes (which could be called as callbacks, triggered by UI events)
-   rerenders the application when the state changes.

These characteristics can be formalized and defined in the so-called Model-View-Intent architecture:

-   We have one central state object: `state` (the "model")
-   We have a function which takes a state as input and produces an UI based on that state: `view = (state) => UI` (the root render function which recursively renders all components)
-   We have a function which takes a state and an intent to change the state and produces the new state: `update = (state, intent) => state = newState` ()
-   Because `update` will always be called with the current state as first parameter, we have a helper function `dispatch = (intent) => {}` which calls `update` internally.
-   The rendered UI produced by `view(state)` has elements (e.g., button) with events (e.g., onClick). These events correspond to one or more intents to change the application's state, and the event handlers therefore call the `dispatch(intentXY)` function to produce that change.
-   Finally, we need a mechanism that triggers rerendering after the state has been changed. We offer a subscription mechanism `subscribe = (callback) => {}`, and subscribe the `view` function to it. `subscribe(view)`

```
            +-------|
            |       |
            |       |
            V       |
dispatch(intent)    |
        |           |
        V           A
view(newState)      |
    |               |
    V               |
   DOM -->--event---+




```

### MVI as explained by pluralsight instructor Liam McLennan

MVI is "[t]he architecture behind well-designed react applications." (Liam McLennan)

-   **MODEL**: A single object that completely describes the state of the UI.
-   **VIEW**: A function that transforms the model into the UI, i.e., the model is the input to the view function and the UI is the output. At any moment the UI can generated from nothing but the model. When the model changes, the view function can generate the corresponding changed UI.
-   **INTENTS**: The UI (generated by the view function) can produce intents. Intents are things the user wants to do. When an intent is produced it is applied to model, creating an updated model. The updated model is then passed through the view function to created the updated user interface.

This process forms a neat, predictable cycle. For the following key reasons:

1. The model is the single source of truth. The entire UI is described by the model.
2. The view produces the UI based on nothing but the model.
3. The model can only be changed by processing intents on the current model.

```
                MODEL
               ^     \
              /       \
             /         v
        INTENT <----- VIEW
```

**Finite State Machine analogy**
Model-View-Intent can be thought if as a finite state machine in which the model is the set of possible states, and the intents are the possible transitions. Intents transition the model from on state to the next. The view is a function from the model to the UI.

**Building MVI architecture from scratch**

```jsx
let model = {};                             // the model is an object

const view = (m) => <.../>;                   // view is a function from the model
                                            // to a user interface

const update = (m, intent) => m2;             // update is a function that applies
                                            // an intent to a model

```

**Stopwatch Example**

```jsx
let model = {
    running: false,
    time: 0
};

const view = (model) => {
    const onClickHandler = (event) => {
        model = update(model, model.running ? intents.STOP : intents.START);
    };
    return (
        <div>
            <p>{model.time}</p>
            <button onClick={onClickHandler}>{model.running ? "STOP" : "START"}</button>
        </div>
    );
};

const intents = {
    TICK: "TICK",
    START: "START",
    STOP: "STOP",
    RESET: "RESET"
};

const update = (model, intent) => {
    const updates = {
        intents.TICK: (model) => Object.assign(model, model.running ? {time: model.time + 1} : model),
        intents.START: (model) => Object.assign(model, {running: true}),
        intents.STOP: (model) => Object.assign(model, {running: false}),
        intents.RESET: (model) => Object.assign(model, {time: 0, running: false})
    };
    return updates[intent](model);
};

const render = () => {
    ReactDOM.render(
        view(model),
        document.getElementById('root)
    );
};
render();

// external event = clock
// apply TICK intent to model and rerender every 1 second
setInterval(
    () => {
        model = update(model, intents.TICK);
        render();
    },
    1000);
```

**Building MVI architecture from scratch - evolution to state container**
State

-   getState()
-   dispatch(intent)
-   subscribe(callback)

```jsx
const view = (model) => {
    const onClickHandler = (event) => {
        container.dispatch(model.running ? intents.STOP : intents.START);
    };
    return (
        <div>
            <p>{model.time}</p>
            <button onClick={onClickHandler}>{model.running ? "STOP" : "START"}</button>
        </div>
    );
};

const intents = {
    TICK: "TICK",
    START: "START",
    STOP: "STOP",
    RESET: "RESET"
};

const update = (model = { running: false, time: 0 }, intent) => {
    const updates = {
        intents.TICK: (model) => Object.assign(model, model.running ? {time: model.time + 1} : model),
        intents.START: (model) => Object.assign(model, {running: true}),
        intents.STOP: (model) => Object.assign(model, {running: false}),
        intents.RESET: (model) => Object.assign(model, {time: 0, running: false})
    };
    return updates[intent](model);
};

const createStore = (reducer) => {
    let internalState;
    const subscribers = [];
    return {
        getState: () => internalState,
        dispatch: (intent) => {
            internalState = reducer(internalState, intent);
            subscribers.forEach((s) => {s();});
        }
        subscribe: (subscriber) => {
            subscribers.push(subscriber);
        }
    };
};

let container = createStore(update);


const render = () => {
    ReactDOM.render(
        view(container.getState()),
        document.getElementById('root)
    );
};
render();

// external event = clock
// apply TICK intent to model and rerender every 1 second
setInterval(
    () => {
        container.dispatch(intents.TICK);
    },
    1000);

```

## Redux

**Redux version of Stopwatch example**

```jsx
import * as Redux from 'redux'

const view = (model) => {
    const onClickHandler = (event) => {
        container.dispatch({ type: model.running ? intents.STOP : intents.START });
    };
    return (
        <div>
            <p>{model.time}</p>
            <button onClick={onClickHandler}>{model.running ? "STOP" : "START"}</button>
        </div>
    );
};

const intents = {
    TICK: "TICK",
    START: "START",
    STOP: "STOP",
    RESET: "RESET"
};

const update = (model, action) => {
    const updates = {
        intents.TICK: (model) => Object.assign({}, model, model.running ? {time: model.time + 1} : model),
        intents.START: (model) => Object.assign({}, model, {running: true}),
        intents.STOP: (model) => Object.assign({}, model, {running: false}),
        intents.RESET: (model) => Object.assign({}, model, {time: 0, running: false})
    };
    return (updates[action.type] || () => model)(model);
};

let container = Redux.createStore(update, { running: false, time: 0 } );


const render = () => {
    ReactDOM.render(
        view(container.getState()),
        document.getElementById('root)
    );
};
render();

// external event = clock
// apply TICK intent to model and rerender every 1 second
setInterval(
    () => {
        container.dispatch({ type: intents.TICK });
    },
    1000
);

```

## React-Redux

"It obscures the simplicity of react and redux."

-   **Provider** is a react component, provided by react-redux. When it is included in a react application, it enables all react components below it in the component tree to connect to the redux store.
-   **Connect** is a function provided by react-redux that enhances react's components, connecting them to the redux store. Connect expects two functions as parameters:
    -   `mapStateToProps` is a function from the redux store to a set of props for the component.
    -   `mapDispatchToProps` is a function (from redux' dispatch function to a set of props for the component) specifying how the component can send actions to the redux store. In practice, this provides a place to map component events to redux store actions.

How it works:

-   Wrapping a react component in a call to the connect function, and in that function call specifiyng how the react component should be connected to the redux store.
-   Wrapping a react component (typically the root component) into a `<ReactRedux.Provider store={container}> ... </ReactRedux.Provider>` enables the connection to the redux store (via `ReactRedux.connect()`) for all react components below.
-   ReactRedux will then care of rerendering when the state changes. Explicit calls to render are not required anymore?!

**React Redux version of Stopwatch example**

_Decoupling react components from redux store via react-redux._

```jsx
import * as Redux from 'redux';
import * as ReactRedux from 'react-redux';

function mapStateToProps(state) {
    return state;
}

function mapDispatchToProps(dispatch) {
    return {
        onStart: () => {dispatch({type: intents.START});},
        onStop: () => {dispatch({type: intents.STOP});}
    };
}

const Stopwatch = ( {running, time, onStart, onStop} ) => {
    const onClickHandler = (event) => {
        if (running) {
            onStop();
         } else {
            onStart();
         }
    };
    return (
        <div>
            <p>{model.time}</p>
            <button onClick={onClickHandler}>{model.running ? "STOP" : "START"}</button>
        </div>
    );
};

// ReactRedux.connect RETURNS a function that expects the react component as an argument
const ConnectedStopwatch = (ReactRedux.connect(mapStateToProps, mapDispatchToProps))(Stopwatch);

const intents = {
    TICK: "TICK",
    START: "START",
    STOP: "STOP",
    RESET: "RESET"
};

const update = (model, action) => {
    const updates = {
        intents.TICK: (model) => Object.assign({}, model, model.running ? {time: model.time + 1} : model),
        intents.START: (model) => Object.assign({}, model, {running: true}),
        intents.STOP: (model) => Object.assign({}, model, {running: false}),
        intents.RESET: (model) => Object.assign({}, model, {time: 0, running: false})
    };
    return (updates[action.type] || () => model)(model);
};

let container = Redux.createStore(update, { running: false, time: 0 } );

ReactDOM.render(
    <ReactRedux.Provider store={container}>
        <Stopwatch/>
    </ReactRedux.Provider>,
    document.getElementById('root)
);

// external event = clock
// apply TICK intent to model and rerender every 1 second
setInterval(
    () => {
        container.dispatch({ type: intents.TICK });
    },
    1000
);

```

[babel]: https://babeljs.io/
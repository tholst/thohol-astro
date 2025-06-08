---
title: Scalable CSS
description: Best pratices and conflicting approaches for modular and portable CSS
pubDate: 2020-02-07
published: false
---

Read:
- https://davidtheclark.com/modular-approach-to-interface-components/
- https://slides.com/linclark/webpack/#/ / https://www.youtube.com/watch?v=p3Wi3xBQdAM
- https://davidtheclark.com/on-utility-classes/
- https://github.com/davidtheclark/scalable-css-reading-list
- https://www.smashingmagazine.com/2013/10/21/challenging-css-best-practices-atomic-approach/
- 
- https://atomicdesign.bradfrost.com/table-of-contents/
- 

-   [ ] **CSS** (modern CSS, scalable CSS, CSS in dev env/build env)
    -   [ ] PostCSS
    -   [ ] SCSS / LESS
    -   [ ] Utility CSS
    -   [ ] Tailwind CSS
    -   [ ] mini-css-extract-plugin
    -   [ ] css-loader
    -   [ ] postcss-loader
    -   [ ] Emotion
    -   [ ] Styled Components
    -   [ ] [BEM's](https://csswizardry.com/2013/01/mindbemding-getting-your-head-round-bem-syntax/)
    -   [ ] [SUIT's](https://github.com/suitcss/suit/blob/master/doc/naming-conventions.md)
    -   [ ] [Atomic CSS](https://acss.io/)
    - COMPONENT-BASED FRAMEWORKs
    - https://github.com/awesome-css-group/awesome-css#readme
    - https://github.com/addyosmani/critical-path-css-tools#readme
    - https://github.com/AllThingsSmitty/must-watch-css#readme
    - https://github.com/AllThingsSmitty/css-protips#readme
    - https://github.com/troxler/awesome-css-frameworks#readme

## Complexity is the enemy

([skip](#css-cant-say-its-simple) Grandpa's war-time stories)

Every software developer knows that even smaller coding projects can get very complex - complex to the point that all its logic and constraints surpass the cognitive capacity of one single human brain. Once that happens, the rate of *new bugs per code change* will often increase. Or, to put it differently: The effort needed to make bug-free code changes will rise dramatically.

If you like a short historical detour, pull up the [1968 NATO Software Engineering Conference report](http://homepages.cs.ncl.ac.uk/brian.randell/NATO/nato1968.PDF) and read Chapter 7.1. on "Software: The state of the art" which discussed the software industry's inability to reliably produce complex software. According to wikipedia, this conference coined the term "[Software Crisis](https://en.wikipedia.org/wiki/Software_crisis)". 

To quote one of the participants:
> The general admission of the existence of the software failure in this group of responsible people is the most refreshing experience I have had in a number of years, because the admission of shortcomings is the primary condition for improvement.
> 
> Dijkstra (1968)

So, what kind of improvements did humankind come up with?

People figured out that complexity was the enemy. Complex problems had to be broken down into smaller, more manageable problems - complex solutions had to be composed up from more simpler solutions. 

Separating concerns ([term coined by Dijkstra in 1974](https://en.wikipedia.org/wiki/Separation_of_concerns#Origin)) - into multiple modules that offer well-defined interfaces (for use by other modules) while encapsulating (and hiding) their inner implementation - enables a level of abstraction that allows humans to understand, discuss and coordinate otherwise overwhelming problems. 

The idea of independent modules with defined interfaces and encapsulated implementation can be found everywhere, from Microservices and OOP Classes to Web Components. In theory, systems made from these modules will be easier to maintain and extend, enabling a better quality and faster development iterations.

There were other important ideas, of course: 
- Patterns (for Software Design, Enterprise Architecture, Refactoring etc.)
- Software Development Processes and Best Practices (Lean, Agile, extreme Programming, Scrum etc.)

## Modularity and Encapsulation in Web Applications

So, what is the situation with applications built for the Web? Long gone are the times of simple HTML websites with some styling (CSS) and interactivity (JS) sprinkled in-between. Today, people build *proper software* that runs on the Web's tech-stack. I mean, you wouldn't call [Google Docs](https://docs.google.com/) a website, would you? It's a Single-Page *Application* that runs in any modern browser.

But how do you build them well - how can you build a complex web application from smaller modules (modules of Web applications are often called *components*) that are independent and encapsulate their inner workings?

CSS can make it quite hard.

1. By default, CSS rules apply globally, to the whole DOM. (Exception: inline-styles only apply to their DOM node/subtree)
1. Multiple rules may be applicable to the same DOM nodes. Specificity and (import) order determine which rules are actually applied.
1. Complex CSS selectors are used to select nodes in the DOM. Unintentional selections can easily occur.
1. Default behavior (when no explicit CSS rules are specified) uses non-zero default values and can be hard to understand.
1. Inheritance: Child nodes inherit styling from their parent nodes. This may be desired in some cases (setting font type only once, at the root node). But it definitely breaks with the modular separation.

In the next sections, we will look at approaches to migitate these problems.

## Utility Classes

A utility class implements a single styling (including layout) effect. The styling effect is usually implemented with a single CSS rule, but sometimes multiple rules are necessary.

A utility class is typically named after its styling effect (e.g., `font-small`, `rotate-90` or `border-black`). Therefore, reading HTML with CSS utility classes is a bit like reading HTML with inline CSS styles. 

```html
<div class="font-small rotate-90 border-black">
    ...
</div>
```

This approach has the advantage that writing HTML markup and simple styling can be done in one easy step. It requires that you already have a comprehensive and intuitive (utility classes don't help if they're hard to remember/deduce) library of utility classes available. You can either agree on some conventions in your dev team (so they will actually be reused and not reinvented with a different naming scheme by each team member), or you just use some existing library like 

- **your team/product/company's own design system**
- [tailwindcss](https://tailwindcss.com/docs/utility-first)
- [bulma](https://bulma.io/documentation/modifiers/helpers/)
- [uikit](https://getuikit.com/v2/docs/utility.html)
- [GroundworkCSS 2](http://groundworkcss.github.io/groundwork/?url=docs/helpers)
- [SUIT CSS](https://github.com/suitcss/utils)
- [bootstrap](https://getbootstrap.com/docs/4.4/utilities/borders/)

- Similar, but different is Atomic Css

## Module/Component Classes

### BEM

### SMACSS

--> [SMACSS Documentation](http://smacss.com/)

SMACSS = **S**calable and **M**odular **A**rchitecture for **CSS**

A convention

#### Categories

SMACSS suggest to organize CSS rules into 5 categories:

1. Base - default styling of main elements (e.g., `html, body, a, a:hover`)
1. Layout - abstract layout of page, arrangement of modules
1. Module - the actual modules: the reusable pieces that make up the content of the application (e.g., list, pop-up, article etc.)
1. State - how modules and layout change when in different states
1. Theme - how modules and layout change when in different themes

#### Naming Rules

1. Layout: with prefix `l-` or `layout-`, e.g., `.layout-vertical`.
2. Module: just the module name, e.g., `.popup`. The elements inside a module use the module as a prefix, e.g., `.popup-title`.
3. State: like a predicate with prefix `is-` or `has-`, e.g., `.is-active`

## CSS: Can't Say it's Simple

Every software developer knows that 

Abstraction
[Separation of concerns](https://en.wikipedia.org/wiki/Separation_of_concerns)
Modularity
Encapsulation is information hiding
Well-defined interfaces (hiding implementation)

higher extensibility
easier maintenance
better quality
independent development
module/component reuse

- (non-inline) CSS rules apply globally to whole DOM
- Complex selectors targeting nodes in a tree
- non-zero defaults
- inheritance of values
- Different implementations between browsers

role
behavior

problems

## dsa

## Using CSS Preprocessors

### PostCSS
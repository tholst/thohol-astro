---
title: Dockerize a Vue.js app
description: Run your web app in a Docker container
pubDate: 2020-05-28
---

If you are building a larger web application with multiple backend and frontend services, chances are high that you will sooner or later want to deploy and run your Vue.js application inside a Docker container. 

Below is a quick how-to guide. Note that the explanations are not really specific to Vue.js. Any other web app should work the same.

**Note**: Web applications that are using Server-Side-Rendering (e.g., with [Nuxt.js](https://nuxtjs.org/)) or other backend logic require more than a [static web server](https://developer.mozilla.org/en-US/docs/Learn/Common_questions/What_is_a_web_server) and are out-of-scope of this post.

## Prerequisites

1. An existing Vue.js project that works with a static web server.

    ```bash
    $ cd my-vue-app
    $ tree -L 2
    .
    ├── src
    │   └── (more files here ...)
    ├── package.json
    └── package-lock.json
    ```

2. Docker installed ([instructions to install](https://docs.docker.com/get-docker/))

    ```bash
    $ docker -v
    Docker version 19.03.8, build afacb8b
    ```

## 1. Create and open Dockerfile

Let's create a [Dockerfile](https://docs.docker.com/engine/reference/builder/).

```bash
$ cd my-vue-app
$ touch Dockerfile
$ code Dockerfile
```

## 2. Understand what we are doing here

**What**: In the next steps we will piece together a `Dockerfile` for our Vue.js app.

**Why**: The `Dockerfile` tells docker how to build a docker image which - when we run it - will act as _[static web server](https://developer.mozilla.org/en-US/docs/Learn/Common_questions/What_is_a_web_server)_ for our Vue.js application.

**How**: We want to optimize on two dimensions: Image size and image build time.

1. We are separating build and execution/production dependencies using so called [multi-stage builds](https://docs.docker.com/develop/develop-images/multistage-build/). Using this approach the final docker image for our app will only contain the necessary web server code (NGINX) but not the code required to build our app (`node`/`npm` and required `node_modules`). This leads to a significantly reduced image size.
2. We base our docker images on the most-lightweight base images possible. Below you will encounter the base images `node:lts-alpine` and `nginx:stable-alpine`. The `-alpine` suffix indicates that those image variants are build on top the very light-weight [Alpine Linux base image](https://hub.docker.com/_/alpine).
3. Docker images are built in layers. Each line in a Dockerfile adds a layer. Docker optimizes the build process by caching layers and only rebuilding them when the underlying dependencies have changed. We can use this feature to our advantage and reduce build times. Specifically, we will see two `COPY` instructions in the build stage below. By only copying the `package.json` files before we run `npm install` we tell docker that the `npm install`-layer (including all downloaded `node_modules`) will only need a rebuild if we made a change to `package.json` or `package-lock.json`.

## 3. Add build stage to Dockerfile

With the following instructions we are telling docker to start our image with a lightweight image that includes the long-term-support version of Node.js and is built on top of Alpine Linux.
We change into the `/app` directory and copy our `package.json` files into it. We then run `npm install` to download all our dependencies. We then copy our whole project root folder into `/app` inside the image (`COPY . .`). Then we run `npm build` which will generate files into the `/app/dist` directory.


```docker
# build stage
FROM node:lts-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
```

## 4. Ignore local build directories

If you look above at our **build stage** instructions, you will see that we `COPY` the whole source folder into the docker image. This is fine if we always build the docker image from a clean git checkout.

But it may lead to unexpected problems if we also have a local installation of the package (i.e., a `node_modules` folder exists) or local build artefacts (i.e., a `dist` folder exists). The `COPY` instruction would then overwrite node modules in the docker image or copy outdated and obsolete build files.

This is why we want to `.dockerignore` those folders if they exist.

1. Create the file if it does not yet exist:

    ```bash
    $ touch .dockerignore
    $ code .dockerignore
    ```

2. Add the following lines to the `.dockerignore` file

    ```bash
    # ignore .git folder
    .git

    # ignore installation and build folders
    node_modules
    dist

    # ignore dev settings
    .vscode
    ```

## 5. Add production stage to Dockerfile

With the following instructions we are telling docker to start our image with a lightweight image that includes the stable version of [Nginx](https://www.nginx.com/) and is built on top of [Alpine Linux](https://alpinelinux.org/).
We are now referencing the previous stage (`build-stage`) to get access to the generated files in `/app/dist` and copy them into NGINX' default folder from which files will be statically served. We expose the web server's default port `80` so that we can map it to a port on the host system. Finally, we specify what command should be executed by default when we `docker run` an instance of this image. We disable NGINX' `daemon` mode to keep it running in the foreground process (instead of forking into a background process).

```docker
# production stage
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 6. Add build scripts for convenient access

In your `package.json` file under `"scripts"` add two scripts `"docker-build"` and `"docker-run"`.

```json
"scripts": {
    "serve": "...",
    "build": "...",
    "lint": "...",
    "docker-build": "docker build -t acme/my-vue-app .",
    "docker-run": "docker run -it -p 8080:80 --rm --name my-vue-app acme/my-vue-app",
}
```

Those scripts can then be run via npm.

- `npm run docker-build` will create a docker with the image name `acme/my-vue-app`.
- `npm run docker-run` will create and run a container instance named `my-vue-app` based on the docker image with the image name `acme/my-vue-app`. The container-internal port `80` will be mapped to the external host-port `8080`. The `-rm` option will remove the container instance when it exists, i.e., a new container instance will be created on each subsequent run.
# Makefile for thohol-astro blog

.PHONY: help dev build preview clean install screenshots

# Default target
help:
	@echo "Available commands:"
	@echo "  make dev      - Start development server"
	@echo "  make build    - Build production site"
	@echo "  make preview  - Preview production build"
	@echo "  make install  - Install dependencies"
	@echo "  make clean    - Clean build directory"
	@echo "  make screenshots - Take screenshots of the site"

# Development server
dev:
	npm run dev

# Build production site
build:
	npm run build

# Preview production build
preview:
	npm run preview

# Install dependencies
install:
	npm install

# Clean build directory
clean:
	rm -rf dist/

# Take screenshots
screenshots:
	npm run screenshots
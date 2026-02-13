# Makefile for thohol-astro blog

.PHONY: help dev build preview clean install screenshots screenshot-homepage

# Default target
help:
	@echo "Available commands:"
	@echo "  make dev      - Start development server"
	@echo "  make build    - Build production site"
	@echo "  make preview  - Preview production build"
	@echo "  make install  - Install dependencies"
	@echo "  make clean    - Clean build directory"
	@echo "  make screenshots - Take screenshots of the site"
	@echo "  make screenshot-homepage - Take a single homepage screenshot"

# Development server
dev:
	VITE_USE_POLLING=1 npm run dev

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

# Take a single homepage screenshot
screenshot-homepage:
	npm run screenshot-homepage

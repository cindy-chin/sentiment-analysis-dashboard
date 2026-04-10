.PHONY: help install install-backend install-frontend backend frontend dev build lint

help:
	@echo "Available targets:"
	@echo "  make install           Install backend and frontend dependencies"
	@echo "  make install-backend   Install Python dependencies"
	@echo "  make install-frontend  Install frontend dependencies"
	@echo "  make backend           Start the Flask backend on port 5000"
	@echo "  make frontend          Start the Vite frontend on port 5173"
	@echo "  make dev               Start backend and frontend together"
	@echo "  make build             Build the frontend for production"
	@echo "  make lint              Run frontend lint checks"

install: install-backend install-frontend

install-backend:
	uv sync

install-frontend:
	cd dashboard && npm install

backend:
	uv run python app.py

frontend:
	cd dashboard && npm run dev

dev:
	@trap 'kill 0' INT TERM EXIT; \
	$(MAKE) backend & \
	$(MAKE) frontend & \
	wait

build:
	cd dashboard && npm run build

lint:
	cd dashboard && npm run lint

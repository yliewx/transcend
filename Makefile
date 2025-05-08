# define makefile variables

COMPOSE = docker compose
COMPOSE_FILE = -f ./docker-compose.yml
COMPOSE_FILE_DEV = -f ./docker-compose.override.yml
ENV_FILE = --env-file ./.env
ENV_FILE_DEV = --env-file ./.env.dev

#------------------------------------------------------------------------

# colours

RED = \033[1;31m
GREEN = \033[1;32m
BROWN = \033[1;33m
END = \033[0m

#------------------------------------------------------------------------

# RULES

all: down up

up:
	@echo "$(GREEN)[ Starting containers in production mode... ]$(END)"
	@$(COMPOSE) $(COMPOSE_FILE) $(ENV_FILE) up --build --force-recreate -d

dev: down
	@echo "$(GREEN)[ Starting containers in development mode... ]$(END)"
	@$(COMPOSE) $(COMPOSE_FILE_DEV) $(ENV_FILE_DEV) up --build --force-recreate -d

cli:
	@echo "$(GREEN)[ Running Pong-CLI... ]$(END)"
	@docker run -it --network="host" src-pong-cli bash

down:
	@echo "$(BROWN)[ Stopping and removing containers... ]$(END)"
	@$(COMPOSE) $(COMPOSE_FILE) down || true
	@$(COMPOSE) $(COMPOSE_FILE_DEV) down || true
	@docker volume rm -f frontend_data || true

clean: down
	@echo "$(BROWN)[ Removing build cache... ]$(END)"
	@docker builder prune -a -f
	@docker system prune -f

fclean: clean
	@echo "$(BROWN)[ Removing volumes... ]$(END)"
	@docker system prune --volumes -af
	@docker volume rm -f sqlite_data avatar_data cloudflared_data || true

re: down up

#------------------------------------------------------------------------

.PHONY: all up down clean fclean re dev cli

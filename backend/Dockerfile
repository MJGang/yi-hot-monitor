FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install dependencies in a separate layer for caching
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-install-project --no-dev

# Copy source
COPY . .

FROM python:3.12-slim AS runtime

WORKDIR /app

# Copy uv and venv from builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY --from=builder /app/.venv /app/.venv

# Copy source and entrypoint
COPY --from=builder /app /app

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

EXPOSE 3001

ENTRYPOINT ["/app/docker-entrypoint.sh"]

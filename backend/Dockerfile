# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM golang:1.21-alpine AS builder

WORKDIR /build

# Download dependencies first (layer-cache friendly)
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build a statically-linked binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/geode-backend .

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM alpine:latest

# Install CA certificates (needed for outbound HTTPS calls, e.g. exchange-rate API)
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /app/geode-backend .

# Ensure the data directory exists inside the container
RUN mkdir -p /app/data

# The data directory is expected to be mounted as a volume at runtime
VOLUME ["/app/data"]

# Tell the app where to find its data
ENV DATA_DIR=/app/data

EXPOSE 8080

CMD ["./geode-backend"]

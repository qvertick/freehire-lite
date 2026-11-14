FROM golang:1.27-alpine AS build
# AS - имя сборки, чтобы потом можно было использовать его в другом месте
WORKDIR /src
# рабочая директория внутри контейнера
COPY go.mod go.sum ./
# копируем файлы go.mod и go.sum в рабочую директорию контейнера ( для установки зависимостей )
RUN go mod download
# ----------------------------------------------- #
COPY . .
# копируем все файлы проекта в рабочую директорию контейнера
RUN mkdir -p /out \
 && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/hire ./cmd/server \
 && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/ \
      ./cmd/ingest ./cmd/enrich ./cmd/reindex ./cmd/tg-ingest ./cmd/tg-extract \
      ./cmd/backfill-derive ./cmd/liveness ./cmd/import-collections \
      ./cmd/recount-companies ./cmd/migrate
# ------------------------------------------------ #
FROM alpine:3.24 AS typst1
ARG TYPST_VERSION=0.15.0 
# скачиваем и распаковываем бинарник typst
RUN apk add --no-cache curl xz \
&& curl -fsSL "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-x86_64-unknown-linux-musl.tar.xz" -o /tmp/typst.tar.xz \
 && tar -xJf /tmp/typst.tar.xz -C /tmp \
 && install -m 0755 /tmp/typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst \
 && /usr/local/bin/typst --version
# --- runtime stage --- #
FROM debian:stable-slim AS runtime
# slim - минимальный образ, без лишних пакетов, 'AS runtime' тут для того, чтобы потом можно было
# использовать его в другом месте, но по сути это конечный образ, который будет использоваться для запуска приложения.
# Tак что можно было бы и не писать AS runtime
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends poppler-utils ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 65532 nonroot \
 && useradd --system --uid 65532 --gid nonroot --home-dir /app nonroot \
 && pdftotext -v

COPY --from=build /out/hire /out/ingest /out/enrich /out/reindex /out/tg-ingest /out/tg-extract /out/backfill-derive /out/liveness /out/import-collections /out/recount-companies /out/migrate /app/
# Копируем бинарники из сборочного контейнера build в рабочую директорию контейнера runtime
COPY --from=build /src/migrations /app/migrations
# Копируем директорию migrations из сборочного контейнера build в рабочую директорию
# контейнера runtime, для того, чтобы при запуске контейнера можно было использовать миграции базы данных.
COPY --from=typst1 /usr/local/bin/typst /app/typst
# Копируем бинарник typst из контейнера typst1 в рабочую директорию контейнера runtime
ENV TYPST_BIN=/app/typst
# Создает переменную окружения TYPST_BIN внутри контейнера runtime, которая указывает на путь к бинарнику typst внутри контейнера.
EXPOSE 8080
# Открывает порт 8080 внутри контейнера, чтобы можно было подключаться к приложению,
# которое будет запущено внутри контейнера. НО не открывает сам порт 8080 наружу
USER nonroot:nonroot
ENTRYPOINT ["/app/hire"]
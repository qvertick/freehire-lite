# Multi-arch образ приложения: linux/amd64 + linux/arm64.
#
# Сборщик всегда работает на архитектуре раннера ($BUILDPLATFORM), а целевую
# архитектуру задаёт $TARGETARCH. Go компилируется кросс-компиляцией, без
# QEMU-эмуляции: под arm64 эмулированная сборка 11 бинарников занимает часы,
# кросс-компиляция — минуты. CGO выключен, C-зависимостей нет.
#
# Важно: TARGETOS/TARGETARCH/BUILDPLATFORM — предопределённые аргументы
# buildx. Их НЕЛЬЗЯ объявлять с дефолтом (например `ARG TARGETARCH=amd64`):
# объявление перебивает автоматическое значение, и кросс-компиляция
# молча собирает родную архитектуру. Поэтому здесь только USING-объявления
# внутри сцен — они наследуют предопределённое значение.
FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS build
# AS - имя сборки, чтобы потом можно было использовать его в другом месте
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
# рабочая директория внутри контейнера
COPY go.mod go.sum ./
# копируем файлы go.mod и go.sum в рабочую директорию контейнера ( для установки зависимостей )
RUN go mod download
# ----------------------------------------------- #
COPY . .
# копируем все файлы проекта в рабочую директорию контейнера
RUN mkdir -p /out \
 && CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -ldflags="-s -w" -o /out/hire ./cmd/server \
 && CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -ldflags="-s -w" -o /out/ \
      ./cmd/ingest ./cmd/enrich ./cmd/reindex ./cmd/tg-ingest ./cmd/tg-extract \
      ./cmd/backfill-derive ./cmd/liveness ./cmd/import-collections \
      ./cmd/recount-companies ./cmd/migrate
# ------------------------------------------------ #
# Сцена typst тоже собирается на архитектуре раннера, но скачивает бинарник
# под ЦЕЛЕВУЮ архитектуру: в arm64-образ раньше попадал x86_64-бинарник, и
# рендер PDF в нём падал с "exec format error".
FROM --platform=$BUILDPLATFORM alpine:3.24 AS typst1
ARG TARGETARCH
ARG TYPST_VERSION=0.15.0
# скачиваем и распаковываем бинарник typst
RUN apk add --no-cache curl xz \
 && case "$TARGETARCH" in \
      amd64) TYPST_TARGET=x86_64-unknown-linux-musl ;; \
      arm64) TYPST_TARGET=aarch64-unknown-linux-musl ;; \
      *) echo "unsupported TARGETARCH: $TARGETARCH" >&2; exit 1 ;; \
    esac \
 && curl -fsSL "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-${TYPST_TARGET}.tar.xz" -o /tmp/typst.tar.xz \
 && tar -xJf /tmp/typst.tar.xz -C /tmp \
 && install -m 0755 /tmp/typst-${TYPST_TARGET}/typst /usr/local/bin/typst \
 && test -x /usr/local/bin/typst
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

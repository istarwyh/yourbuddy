# Official multi-platform Node image, verified on 2026-09-06. Node and the ACP
# SDK are checked again by the adapter before any Candidate code is started.
FROM node:22.22.2-bookworm-slim@sha256:9f6d5975c7dca860947d3915877f85607946403fc55349f39b4bc3688448bb6e

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv curl coreutils bash ca-certificates \
    && python3 -m venv /opt/harbor-acp-venv \
    && /opt/harbor-acp-venv/bin/pip install --no-cache-dir --disable-pip-version-check agent-client-protocol==0.12.1 \
    && node -e 'if (process.versions.node !== "22.22.2") process.exit(1)' \
    && /opt/harbor-acp-venv/bin/python -c 'import importlib.metadata; assert importlib.metadata.version("agent-client-protocol") == "0.12.1"' \
    && rm -rf /var/lib/apt/lists/*

# Candidate files and their npm lock are uploaded by the adapter. No Host
# node_modules, credentials, or mutable package installation is baked here.
WORKDIR /workspace

"""Keyless readiness of the exact installed launcher, never an evaluation prompt."""
from __future__ import annotations

import argparse
import asyncio
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory

from acp import PROTOCOL_VERSION, spawn_agent_process
from acp.schema import ClientCapabilities
from acp_runner import HarborAcpClient


async def check(launcher: str) -> None:
    # The production gateway refuses model requests before making HTTP calls.
    environment = {**os.environ, "HSE_MODEL_GATEWAY_PREFLIGHT": "1"}
    with TemporaryDirectory(prefix="harbor-acp-readiness-") as temporary:
        client = HarborAcpClient(logs_dir=Path(temporary), permission_mode="deny")
        async with asyncio.timeout(30):
            async with spawn_agent_process(client, launcher, env=environment, cwd=Path.cwd(), transport_kwargs={"stderr": None}) as (connection, _process):
                initialized = await connection.initialize(protocol_version=PROTOCOL_VERSION, client_capabilities=ClientCapabilities())
                if initialized.protocol_version != PROTOCOL_VERSION:
                    raise RuntimeError("Candidate ACP protocol version mismatch")
                session = await connection.new_session(cwd=str(Path.cwd()), mcp_servers=[])
                if not session.session_id:
                    raise RuntimeError("Candidate ACP session/new returned no session identity")
                print(json.dumps({"status": "ready", "protocol_version": PROTOCOL_VERSION, "model_requests": "disabled"}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--launcher", required=True)
    asyncio.run(check(parser.parse_args().launcher))

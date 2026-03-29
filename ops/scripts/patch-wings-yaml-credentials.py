#!/usr/bin/env python3
"""Update uuid, token_id, token in a Wings config.yml from Panel credential env lines."""
import re
import sys
from pathlib import Path

def main() -> int:
    if len(sys.argv) != 3:
        print("usage: patch-wings-yaml-credentials.py <wings.yml> <credentials.env>", file=sys.stderr)
        return 2
    yml = Path(sys.argv[1])
    envp = Path(sys.argv[2])
    vals = {}
    for line in envp.read_text(encoding="utf-8").strip().splitlines():
        if "=" not in line or line.startswith("#"):
            continue
        k, _, v = line.partition("=")
        vals[k.strip()] = v.strip()
    req = ("PTERODACTYL_NODE_UUID", "PTERODACTYL_TOKEN_ID", "PTERODACTYL_TOKEN")
    for k in req:
        if k not in vals:
            print(f"missing {k}", file=sys.stderr)
            return 1
    text = yml.read_text(encoding="utf-8")
    text = re.sub(r"^uuid:.*$", f"uuid: {vals['PTERODACTYL_NODE_UUID']}", text, count=1, flags=re.M)
    text = re.sub(r"^token_id:.*$", f"token_id: {vals['PTERODACTYL_TOKEN_ID']}", text, count=1, flags=re.M)
    text = re.sub(r"^token:.*$", f"token: {vals['PTERODACTYL_TOKEN']}", text, count=1, flags=re.M)
    yml.write_text(text, encoding="utf-8")
    print("updated", yml)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Spike L10 P0 — claude stream-json bidirectionnel DANS UN PTY + interrupt.
Jetable. Lance `claude` en flux structuré dans un vrai PTY (comme terminal.rs),
envoie un tour qui lance une commande longue, puis injecte {"type":"interrupt"}
~3s plus tard et observe si l'abort remonte dans le NDJSON."""
import os, pty, json, select, time, sys

CMD = [
    "claude", "--print",
    "--input-format", "stream-json",
    "--output-format", "stream-json",
    "--verbose", "--include-partial-messages",
    "--model", "claude-haiku-4-5",
    "--dangerously-skip-permissions",
    "--allowedTools", "Bash",
]

master, slave = pty.openpty()
pid = os.fork()
if pid == 0:  # child: claude attaché au PTY (stdin/out/err)
    os.setsid()
    os.dup2(slave, 0); os.dup2(slave, 1); os.dup2(slave, 2)
    os.close(master); os.close(slave)
    os.execvp(CMD[0], CMD)
    os._exit(127)

os.close(slave)

def send(obj):
    line = (json.dumps(obj) + "\n").encode()
    os.write(master, line)
    print(f">>> STDIN: {json.dumps(obj)[:90]}", flush=True)

# Tour 1 : commande qui dure -> laisse le temps d'interrompre
send({"type": "user", "message": {"role": "user", "content": [
    {"type": "text", "text": "Lance la commande bash: sleep 30 && echo FINI . Utilise l'outil Bash."}]}})

buf = b""
start = time.time()
interrupt_sent = False
saw_tool_use = False
types_seen = []
raw_lines = []

while True:
    if time.time() - start > 45:
        print("=== TIMEOUT 45s ==="); break
    r, _, _ = select.select([master], [], [], 1.0)
    if master in r:
        try:
            data = os.read(master, 4096)
        except OSError:
            print("=== PTY EOF/closed ==="); break
        if not data:
            print("=== EOF ==="); break
        buf += data
        while b"\n" in buf:
            raw, buf = buf.split(b"\n", 1)
            s = raw.decode(errors="replace").strip()
            if not s:
                continue
            raw_lines.append(s)
            try:
                o = json.loads(s)
            except Exception:
                print(f"    NON-JSON[{len(s)}b]: {s[:80]}")
                continue
            t = o.get("type")
            sub = o.get("subtype", "")
            types_seen.append(t if not sub else f"{t}/{sub}")
            if t == "assistant":
                for b in o.get("message", {}).get("content", []):
                    if b.get("type") == "tool_use":
                        print(f"    <<< tool_use: {b.get('name')} {json.dumps(b.get('input'))[:60]}")
                        saw_tool_use = True
                    elif b.get("type") == "text" and b.get("text", "").strip():
                        print(f"    <<< assistant.text: {b['text'][:70]!r}")
            elif t == "result":
                print(f"    <<< RESULT subtype={sub} is_error={o.get('is_error')} result={str(o.get('result'))[:60]!r}")
                print("=== result recu -> fin ===");
                # fin du tour
                raise SystemExit
            elif t in ("system", "stream_event", "rate_limit_event", "user"):
                pass
    # injecter l'interrupt une fois la commande lancee
    if (saw_tool_use or time.time() - start > 4) and not interrupt_sent:
        time.sleep(0.5)
        send({"type": "interrupt"})
        interrupt_sent = True
        t_interrupt = time.time()

print("\n=== TYPES VUS ===", types_seen)

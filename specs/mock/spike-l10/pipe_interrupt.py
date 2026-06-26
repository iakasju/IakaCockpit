#!/usr/bin/env python3
"""Spike L10 P0 — interrupt via PIPES (stdin/stdout = pipes, pas TTY).
Lance une commande longue puis injecte {"type":"interrupt"} et observe l'abort."""
import subprocess, json, threading, time, sys

CMD = [
    "claude", "--print",
    "--input-format", "stream-json",
    "--output-format", "stream-json",
    "--verbose",
    "--model", "claude-haiku-4-5",
    "--dangerously-skip-permissions",
    "--allowedTools", "Bash",
]

p = subprocess.Popen(CMD, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                     stderr=subprocess.PIPE, bufsize=0)

def send(obj):
    p.stdin.write((json.dumps(obj) + "\n").encode()); p.stdin.flush()
    print(f">>> STDIN: {json.dumps(obj)[:80]}", flush=True)

types_seen = []
saw_tool_use = {"v": False}
result_subtype = {"v": None}

def reader():
    for raw in p.stdout:
        s = raw.decode(errors="replace").strip()
        if not s: continue
        try: o = json.loads(s)
        except Exception:
            print(f"    NON-JSON: {s[:80]}"); continue
        t = o.get("type"); sub = o.get("subtype", "")
        types_seen.append(t if not sub else f"{t}/{sub}")
        if t == "assistant":
            for b in o.get("message", {}).get("content", []):
                if b.get("type") == "tool_use":
                    print(f"    <<< tool_use {b.get('name')} {json.dumps(b.get('input'))[:50]}")
                    saw_tool_use["v"] = True
                elif b.get("type") == "text" and b.get("text", "").strip():
                    print(f"    <<< assistant.text {b['text'][:70]!r}")
        elif t == "user":
            for b in o.get("message", {}).get("content", []):
                if b.get("type") == "tool_result":
                    print(f"    <<< tool_result {str(b.get('content'))[:50]!r}")
        elif t == "result":
            result_subtype["v"] = sub
            print(f"    <<< RESULT subtype={sub} is_error={o.get('is_error')} result={str(o.get('result'))[:50]!r}")

th = threading.Thread(target=reader, daemon=True); th.start()

# Tour 1 : commande longue
send({"type": "user", "message": {"role": "user", "content": [
    {"type": "text", "text": "Lance exactement cette commande bash et attends sa fin: sleep 20"}]}})

# attendre que le tool_use parte, puis interrompre
t0 = time.time()
while not saw_tool_use["v"] and time.time() - t0 < 15:
    time.sleep(0.2)
print(f"[spike] tool_use vu={saw_tool_use['v']} apres {time.time()-t0:.1f}s, j'attends 2s puis INTERRUPT")
time.sleep(2)
t_int = time.time()
send({"type": "interrupt"})

# observer la suite ~12s : un abort rapide ? un result/error ?
time.sleep(12)
print(f"[spike] {time.time()-t_int:.1f}s apres interrupt | result_subtype={result_subtype['v']}")
print("=== TYPES VUS ===", types_seen)
try: p.stdin.close()
except: pass
p.terminate()
err = p.stderr.read().decode(errors="replace")
if err.strip(): print("=== STDERR ===\n", err[:400])

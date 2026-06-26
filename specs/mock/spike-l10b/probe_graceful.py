#!/usr/bin/env python3
"""Graceful : turn termine + idle, puis /exit propre. Surveille apparition fichier."""
import os, pty, time, uuid, select, termios, struct, fcntl, threading, re, glob

CWD = "/Users/sjupin/work/iaka-demo"
SID = str(uuid.uuid4())
PROJECTS = os.path.expanduser("~/.claude/projects")
ESCAPED = re.sub(r"[/.]", "-", CWD)
print("session-id=", SID, "| dossier predit:", ESCAPED)

def find_file():
    g = glob.glob(os.path.join(PROJECTS, "*", f"{SID}.jsonl"))
    return g[0] if g else None

m, s = pty.openpty()
fcntl.ioctl(s, termios.TIOCSWINSZ, struct.pack("HHHH", 45, 120, 0, 0))
env = dict(os.environ); env["TERM"] = "xterm-256color"
cmd = ["claude", "--session-id", SID, "--model", "claude-haiku-4-5"]
pid = os.fork()
if pid == 0:
    os.setsid(); fcntl.ioctl(s, termios.TIOCSCTTY, 0)
    os.dup2(s,0); os.dup2(s,1); os.dup2(s,2); os.close(m); os.close(s)
    os.chdir(CWD); os.execvpe(cmd[0], cmd, env); os._exit(127)
os.close(s)
buf = bytearray(); stop = threading.Event()
def reader():
    while not stop.is_set():
        try: r,_,_ = select.select([m],[],[],0.2)
        except (OSError,ValueError): break
        if m in r:
            try: d = os.read(m,65536)
            except OSError: break
            if not d: break
            buf.extend(d)
threading.Thread(target=reader, daemon=True).start()

def watch(label, secs):
    t0=time.time()
    while time.time()-t0 < secs:
        f=find_file()
        if f:
            print(f"*** [{label}] FICHIER a t+{time.time()-t0:.1f}s : {f} ({os.path.getsize(f)}o)")
            return f
        time.sleep(0.3)
    return None

time.sleep(6)
print(">>> turn simple")
os.write(m, b"Dis bonjour en un mot."); time.sleep(0.6); os.write(m, b"\r")
print(">>> attente reponse + idle (30s), surveillance fichier…")
if watch("pendant-turn", 30): pass
print(">>> /exit (sortie gracieuse depuis idle)")
os.write(m, b"/exit"); time.sleep(0.8); os.write(m, b"\r")
print(">>> surveillance apparition fichier post-/exit (15s)…")
watch("post-exit", 15)
# attendre fin process
for _ in range(30):
    try:
        if os.waitpid(pid, os.WNOHANG)[0]==pid:
            print("[proc] termine"); break
    except OSError: break
    time.sleep(0.3)
time.sleep(2)
stop.set()
f=find_file()
print("FINAL fichier:", f)
if f:
    print("  dossier:", os.path.basename(os.path.dirname(f)), "match:", os.path.basename(os.path.dirname(f))==ESCAPED)
try: os.kill(pid,9); os.waitpid(pid,0)
except OSError: pass

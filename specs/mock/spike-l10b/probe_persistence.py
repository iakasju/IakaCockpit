#!/usr/bin/env python3
"""Probe : --session-id cree-t-il le transcript ? Sans --dangerously-skip-permissions."""
import os, pty, time, uuid, select, termios, struct, fcntl, threading, re, glob, sys

CWD = "/Users/sjupin/work/iaka-demo"
MODEL = "claude-haiku-4-5"
SID = str(uuid.uuid4())
PROJECTS = os.path.expanduser("~/.claude/projects")
ESCAPED = re.sub(r"[/.]", "-", CWD)
PRED = os.path.join(PROJECTS, ESCAPED, f"{SID}.jsonl")
EXTRA = sys.argv[1:]  # flags additionnels eventuels

print(f"session-id={SID}")
print(f"predit={PRED}")
print(f"flags-extra={EXTRA}")

m, s = pty.openpty()
fcntl.ioctl(s, termios.TIOCSWINSZ, struct.pack("HHHH", 45, 120, 0, 0))
env = dict(os.environ); env["TERM"] = "xterm-256color"
cmd = ["claude", "--session-id", SID, "--model", MODEL] + EXTRA
pid = os.fork()
if pid == 0:
    os.setsid(); fcntl.ioctl(s, termios.TIOCSCTTY, 0)
    os.dup2(s,0); os.dup2(s,1); os.dup2(s,2); os.close(m); os.close(s)
    os.chdir(CWD); os.execvpe(cmd[0], cmd, env); os._exit(127)
os.close(s)
stop = threading.Event()
def reader():
    while not stop.is_set():
        try:
            r,_,_ = select.select([m],[],[],0.2)
        except (OSError,ValueError): break
        if m in r:
            try: d = os.read(m,65536)
            except OSError: break
            if not d: break
threading.Thread(target=reader, daemon=True).start()

def exists_glob():
    g = glob.glob(os.path.join(PROJECTS, "*", f"{SID}.jsonl"))
    return g[0] if g else None

time.sleep(6)
print(">>> tape: bonjour")
os.write(m, b"Dis bonjour en un mot."); time.sleep(0.5); os.write(m, b"\r")
# poll existence pendant 25s pendant que la session vit
for i in range(50):
    time.sleep(0.5)
    f = exists_glob()
    if f:
        print(f"*** FICHIER APPARU LIVE a t+{6+(i+1)*0.5:.1f}s : {f}  taille={os.path.getsize(f)}")
        break
else:
    print("--- aucun fichier pendant la session ---")
# sortie propre
print(">>> Ctrl-C x2 (sortie propre)")
os.write(m, b"\x03"); time.sleep(0.6); os.write(m, b"\x03")
for _ in range(40):
    time.sleep(0.2)
    try:
        if os.waitpid(pid, os.WNOHANG)[0] == pid: break
    except OSError: break
time.sleep(3)
stop.set()
f = exists_glob()
print(f"POST-EXIT: fichier = {f}")
if f:
    print(f"  dossier reel = {os.path.basename(os.path.dirname(f))}  / predit = {ESCAPED}  / match={os.path.basename(os.path.dirname(f))==ESCAPED}")
try: os.kill(pid,9); os.waitpid(pid,0)
except OSError: pass

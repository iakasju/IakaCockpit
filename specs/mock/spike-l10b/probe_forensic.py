#!/usr/bin/env python3
"""Forensic : snapshot avant/apres + capture sortie + exit via /quit."""
import os, pty, time, uuid, select, termios, struct, fcntl, threading, re, glob, subprocess

CWD = "/Users/sjupin/work/iaka-demo"
MODEL = "claude-haiku-4-5"
SID = str(uuid.uuid4())
HOME = os.path.expanduser("~/.claude")
ESCAPED = re.sub(r"[/.]", "-", CWD)
print("session-id=", SID)

def snap():
    out = subprocess.run(["find", HOME, "-type", "f", "-newermt", "-10 minutes"],
                         capture_output=True, text=True).stdout
    return set(out.splitlines())

before = snap()
print("fichiers recents avant:", len(before))

m, s = pty.openpty()
fcntl.ioctl(s, termios.TIOCSWINSZ, struct.pack("HHHH", 45, 120, 0, 0))
env = dict(os.environ); env["TERM"] = "xterm-256color"
cmd = ["claude", "--session-id", SID, "--model", MODEL]
pid = os.fork()
if pid == 0:
    os.setsid(); fcntl.ioctl(s, termios.TIOCSCTTY, 0)
    os.dup2(s,0); os.dup2(s,1); os.dup2(s,2); os.close(m); os.close(s)
    os.chdir(CWD); os.execvpe(cmd[0], cmd, env); os._exit(127)
os.close(s)
captured = []
stop = threading.Event()
def reader():
    while not stop.is_set():
        try: r,_,_ = select.select([m],[],[],0.2)
        except (OSError,ValueError): break
        if m in r:
            try: d = os.read(m,65536)
            except OSError: break
            if not d: break
            captured.append(d)
threading.Thread(target=reader, daemon=True).start()

time.sleep(6)
print(">>> tape une question simple")
os.write(m, b"Dis bonjour en un mot."); time.sleep(0.6); os.write(m, b"\r")
time.sleep(20)
# snapshot pendant la session (live ?)
during = snap() - before
print("NOUVEAUX fichiers PENDANT la session:", during)
print(">>> exit via /quit")
os.write(m, b"/quit"); time.sleep(0.6); os.write(m, b"\r")
time.sleep(5)
# si /quit n'a pas marche, Ctrl-C
try:
    if os.waitpid(pid, os.WNOHANG)[0] != pid:
        os.write(m, b"\x03"); time.sleep(0.5); os.write(m, b"\x03"); time.sleep(3)
except OSError: pass
stop.set()
after = snap() - before
print("NOUVEAUX fichiers APRES exit:", after)
try: os.kill(pid,9); os.waitpid(pid,0)
except OSError: pass

# afficher la sortie nettoyee (preuve que le tour a eu lieu)
data = b"".join(captured).decode("utf-8","replace")
clean = re.sub(r"\x1b\[[0-9;?]*[a-zA-Z]","",data)
clean = re.sub(r"\x1b\][^\x07]*\x07","",clean)
clean = re.sub(r"[\x00-\x08\x0e-\x1f]","",clean)
print("=== extrait sortie TUI (derniers 800c) ===")
print(clean[-800:])

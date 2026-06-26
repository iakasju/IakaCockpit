#!/usr/bin/env python3
"""
Spike L10b — PREUVE jetable (hors-app) de l'architecture cible L10 redefinie.

But : prouver end-to-end que
  1. on AUTO-LANCE `claude` en TUI NATIVE interactive dans un PTY (pty.openpty),
     cwd positionne sur un vrai projet sous le chapeau, --session-id pre-genere,
     --model claude-haiku-4-5 ; ZERO manip humaine (pas de `cd`, pas de taper claude).
  2. on simule la frappe de Stephane dans le MASTER du PTY (2 tours : une parole,
     un tour qui declenche un outil/geste).
  3. les VUES (paroles / gestes-delegations / activite) se derivent NON du stdout
     ANSI mais du TRANSCRIT JSONL que Claude Code ecrit en direct sur disque :
        ~/.claude/projects/<cwd-escaped>/<session_id>.jsonl
     escaping = chemin absolu, chaque '/' et '.' remplace par '-'.

Le terminal reste la SOURCE DE VERITE (TUI native, reflexes intacts : Shift+Tab, esc...) ;
le tailer du JSONL alimente les vues filtrees, EN PARALLELE, pendant que la TUI tourne.

Usage :  python3 spike_l10b.py
Sortie :  vues derivees sur stdout, log PTY brut dans ./pty_raw.log
"""
import os, sys, pty, json, time, uuid, select, termios, struct, fcntl, threading, re, glob

# ---------------------------------------------------------------------------
# 0. Parametres du spike
# ---------------------------------------------------------------------------
CWD = "/Users/sjupin/work/iaka-demo"          # vrai projet sous le chapeau ~/work
MODEL = "claude-haiku-4-5"                      # economie
SESSION_ID = str(uuid.uuid4())                 # pre-genere -> on connait le fichier d'avance
HERE = os.path.dirname(os.path.abspath(__file__))
RAW_LOG = os.path.join(HERE, "pty_raw.log")

# Regle d'escaping observee : /Users/sjupin/work/IakaCockpit -> -Users-sjupin-work-IakaCockpit
def escape_cwd(path: str) -> str:
    return re.sub(r"[/.]", "-", path)

PROJECTS = os.path.expanduser("~/.claude/projects")
ESCAPED = escape_cwd(CWD)
TRANSCRIPT = os.path.join(PROJECTS, ESCAPED, f"{SESSION_ID}.jsonl")

def log(msg):
    print(msg, flush=True)

log("=" * 78)
log("SPIKE L10b — auto-lancement hands-off + vues derivees du transcript JSONL")
log("=" * 78)
log(f"  cwd projet       : {CWD}")
log(f"  modele           : {MODEL}")
log(f"  session-id       : {SESSION_ID}")
log(f"  cwd-escaped      : {ESCAPED}")
log(f"  transcript prevu : {TRANSCRIPT}")
log("=" * 78)

# ---------------------------------------------------------------------------
# 1. AUTO-LANCEMENT : claude en TUI native dans un PTY, cwd impose
# ---------------------------------------------------------------------------
master_fd, slave_fd = pty.openpty()
# fixer une taille de fenetre realiste (sinon la TUI peut mal se rendre)
winsize = struct.pack("HHHH", 45, 120, 0, 0)
fcntl.ioctl(slave_fd, termios.TIOCSWINSZ, winsize)

env = dict(os.environ)
env["TERM"] = "xterm-256color"
# IMPORTANT : on tourne potentiellement DANS une session Claude Code. Les variables
# de session-enfant heritees (CLAUDE_CODE_CHILD_SESSION, CLAUDE_CODE_SESSION_ID,
# CLAUDECODE...) font que le claude forke se croit "nested" et N'ECRIT PAS son
# transcript top-level ~/.claude/projects/<escaped>/<sid>.jsonl. Le vrai cockpit
# (process Tauri) lance claude depuis un env PROPRE. On reproduit ca : on SCRUBBE.
for k in list(env):
    if k.startswith("CLAUDE_CODE_") or k in ("CLAUDECODE", "CLAUDE_EFFORT", "AI_AGENT"):
        env.pop(k, None)

cmd = [
    "claude",
    "--session-id", SESSION_ID,
    "--model", MODEL,
    "--dangerously-skip-permissions",   # hands-off : pas de prompt de permission d'outil
]

pid = os.fork()
if pid == 0:
    # --- enfant : devient le process claude, attache au slave du PTY ---
    os.setsid()
    fcntl.ioctl(slave_fd, termios.TIOCSCTTY, 0)
    os.dup2(slave_fd, 0)
    os.dup2(slave_fd, 1)
    os.dup2(slave_fd, 2)
    os.close(master_fd)
    os.close(slave_fd)
    os.chdir(CWD)                        # <-- current_dir = cwd projet, ZERO cd humain
    os.execvpe(cmd[0], cmd, env)
    os._exit(127)

# --- parent : pilote le master ---
os.close(slave_fd)
raw = open(RAW_LOG, "wb")
stop = threading.Event()

def feed_master(s: str):
    os.write(master_fd, s.encode())

# Lecteur du master : draine le flux ANSI (source de verite), le journalise,
# et accepte automatiquement un eventuel dialogue de confiance (hands-off).
trust_handled = {"done": False}
def pty_reader():
    buf = b""
    while not stop.is_set():
        try:
            r, _, _ = select.select([master_fd], [], [], 0.2)
        except (OSError, ValueError):
            break
        if master_fd in r:
            try:
                data = os.read(master_fd, 65536)
            except OSError:
                break
            if not data:
                break
            raw.write(data); raw.flush()
            buf += data
            txt = buf.decode("utf-8", "replace")
            low = txt.lower()
            # Dialogue de confiance eventuel -> accepter (Enter) une seule fois
            if not trust_handled["done"] and ("do you trust" in low or "trust the files" in low or "trust this folder" in low):
                trust_handled["done"] = True
                log("[PTY] dialogue de confiance detecte -> acceptation auto (Enter)")
                time.sleep(0.4)
                feed_master("\r")
            buf = buf[-4000:]  # borne le buffer
    raw.close()

threading.Thread(target=pty_reader, daemon=True).start()

# ---------------------------------------------------------------------------
# 2. TAILER du transcript JSONL -> VUES DERIVEES (en parallele, en direct)
# ---------------------------------------------------------------------------
def short(v, n=140):
    s = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)
    s = s.replace("\n", " ")
    return s if len(s) <= n else s[:n] + "…"

def render_block(kind, blk, tool_names):
    """Traduit un bloc de contenu en ligne de vue derivee."""
    bt = blk.get("type")
    if bt == "text":
        txt = blk.get("text", "").strip()
        if txt:
            log(f"  [PAROLE][{kind}] {short(txt)}")
    elif bt == "thinking":
        log(f"  [ACTIVITÉ][{kind}] (reflexion interne) {short(blk.get('thinking',''), 80)}")
    elif bt == "tool_use":
        name = blk.get("name", "?")
        tool_names[blk.get("id")] = name
        inp = short(blk.get("input", {}), 120)
        if name == "Task":
            sub = (blk.get("input") or {}).get("subagent_type", "?")
            desc = (blk.get("input") or {}).get("description", "")
            log(f"  [DELEGATION] subagent={sub} :: {short(desc, 90)}")
        else:
            log(f"  [GESTE] tool_use={name} input={inp}")
    elif bt == "tool_result":
        tid = blk.get("tool_use_id")
        name = tool_names.get(tid, "?")
        log(f"  [ACTIVITÉ] resultat outil={name} (fin de geste)")

def handle_record(o, tool_names):
    t = o.get("type")
    if t in ("user", "assistant"):
        msg = o.get("message", {}) or {}
        c = msg.get("content")
        if isinstance(c, str):
            if c.strip():
                log(f"  [PAROLE][{t}] {short(c)}")
        elif isinstance(c, list):
            for blk in c:
                if isinstance(blk, dict):
                    render_block(t, blk, tool_names)

def tailer():
    tool_names = {}
    log("[TAIL] attente de creation du transcript…")
    waited = 0.0
    next_beat = 2.0
    while not os.path.exists(TRANSCRIPT) and not stop.is_set():
        time.sleep(0.1); waited += 0.1
        if waited >= next_beat:
            log(f"[TAIL] heartbeat t+{waited:.0f}s : fichier pas encore present")
            next_beat += 2.0
    if os.path.exists(TRANSCRIPT):
        log(f"[TAIL] transcript APPARU apres {waited:.1f}s : {TRANSCRIPT}")
    else:
        log("[TAIL] transcript jamais apparu (stop demande)"); return
    buf = ""
    with open(TRANSCRIPT, "r") as fh:
        while not stop.is_set():
            line = fh.readline()
            if not line:
                time.sleep(0.15); continue
            buf += line
            if not buf.endswith("\n"):
                continue  # ligne partielle : on attend la suite
            for raw_line in buf.splitlines():
                raw_line = raw_line.strip()
                if not raw_line:
                    continue
                try:
                    o = json.loads(raw_line)
                except json.JSONDecodeError:
                    continue
                handle_record(o, tool_names)
            buf = ""

threading.Thread(target=tailer, daemon=True).start()

# ---------------------------------------------------------------------------
# 3. SIMULATION DE FRAPPE : 2 tours dans le MASTER du PTY
# ---------------------------------------------------------------------------
def type_line(text, settle=2.0):
    """Tape un texte dans la TUI puis Entree (\\r) pour soumettre."""
    log(f"\n>>> FRAPPE (master PTY) : {text!r}")
    time.sleep(settle)
    feed_master(text)
    time.sleep(0.6)
    feed_master("\r")

log("\n[BOOT] attente du demarrage de la TUI native (5 s)…")
time.sleep(5)

# Tour 1 : parole simple
type_line("Dis bonjour en exactement un mot, rien d'autre.", settle=0.5)
log("[WAIT] reponse tour 1…")
time.sleep(18)

# Tour 2 : declenche un GESTE (outil) -> tool_use dans le transcript
type_line("Liste les fichiers a la racine du projet avec un outil, puis resume en une phrase.", settle=0.5)
log("[WAIT] reponse tour 2 (geste/outil attendu)…")
time.sleep(30)

# ---------------------------------------------------------------------------
# 4. Sortie PROPRE de la TUI (PAS de kill -9 : on veut que claude flushe/persiste)
# ---------------------------------------------------------------------------
log("\n[EXIT] fermeture PROPRE de la session (Ctrl-C x2)…")
feed_master("\x03"); time.sleep(0.6); feed_master("\x03")
# laisser claude se fermer proprement et ecrire/flusher le transcript
log("[EXIT] attente de la sortie propre + flush du transcript (12 s, tail toujours actif)…")
for _ in range(60):
    time.sleep(0.2)
    try:
        wpid, _ = os.waitpid(pid, os.WNOHANG)
        if wpid == pid:
            log("[EXIT] process claude termine proprement")
            break
    except OSError:
        break
# fenetre supplementaire pour laisser le tailer capter un eventuel flush tardif
log("[POST] fenetre tail post-exit (10 s)…")
time.sleep(10)
stop.set()
# si encore vivant, alors seulement on force
try:
    os.kill(pid, 0)
    os.kill(pid, 9)
    os.waitpid(pid, 0)
except OSError:
    pass

# ---------------------------------------------------------------------------
# 5. Verification de la regle d'escaping par OBSERVATION du vrai fichier
# ---------------------------------------------------------------------------
log("\n" + "=" * 78)
log("VERIFICATION POST-RUN")
hits = glob.glob(os.path.join(PROJECTS, "*", f"{SESSION_ID}.jsonl"))
if hits:
    actual = hits[0]
    actual_dir = os.path.basename(os.path.dirname(actual))
    log(f"  fichier reel cree : {actual}")
    log(f"  dossier reel      : {actual_dir}")
    log(f"  dossier predit    : {ESCAPED}")
    log(f"  REGLE ESCAPING OK : {actual_dir == ESCAPED}")
    log(f"  taille transcript : {os.path.getsize(actual)} octets")
else:
    log(f"  AUCUN fichier {SESSION_ID}.jsonl trouve sous {PROJECTS}")
log("=" * 78)
log("FIN DU SPIKE")

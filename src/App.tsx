/**
 * App.tsx — SHELL DE NAVIGATION (D1/D6). Pas de god-component : l'état métier
 * vit dans des hooks séparés (usePortfolio, useGridState, useWorkset, usePty,
 * useSettings, useServices) ; App ne fait que câbler et router les 3 vues.
 *
 * Aucun `invoke`/`listen` ici (ni nulle part hors `backend.ts`). Les vues sont
 * présentationnelles ; les seuls effets I/O passent par les hooks/façade.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "./i18n";
import { usePortfolio } from "./hooks/usePortfolio";
import { useGridState } from "./hooks/useGridState";
import { useConversations } from "./hooks/useConversations";
import { useTeams, isExecutableRunner } from "./hooks/useTeams";
import { useRunnerViews } from "./hooks/useRunnerViews";
import { useAgentTasks } from "./hooks/useAgentTasks";
import { useEconomy } from "./hooks/useEconomy";
import { useEffects, sortedEffects } from "./hooks/useEffects";
import { usePlan } from "./hooks/usePlan";
import { derivePlanTimeline } from "./hooks/derivePlanTimeline";
import { useNow } from "./hooks/useNow";
import {
  useLiveStatus,
  deriveRosterLiveStatus,
  deriveLiveStatus,
} from "./hooks/useLiveStatus";
import { usePortfolioEconomy } from "./hooks/usePortfolioEconomy";
import { usePortfolioActivity } from "./hooks/usePortfolioActivity";
import { useWorkset } from "./hooks/useWorkset";
import { usePrepareResume } from "./hooks/usePrepareResume";
import { usePty } from "./hooks/usePty";
import { clampTermFontSize, useSettings } from "./hooks/useSettings";
import { useServices } from "./hooks/useServices";
import { useNextStep } from "./hooks/useNextStep";
import { useAppUpdate } from "./hooks/useAppUpdate";
import { UpdateBanner } from "./components/UpdateBanner";
import { useDemoSeed, DEMO_PROJECT_ID } from "./hooks/useDemoSeed";
// Nav vocale (L16-P1) DÉBRANCHÉE 2026-07-02 : le vocal sert à parler DANS le chat
// (dictée, cf. WorkingView/useVoiceDictation), pas à piloter le cockpit. Les fichiers
// `useVoiceCommand`/`VoiceMic`/`voice/dispatcher` sont conservés (débranché, pas supprimé).
import {
  DEMO_PLAN,
  DEMO_ECONOMY,
  DEMO_EFFECTS,
  DEMO_EFFECTS_TOTAL,
  DEMO_TIMELINE,
  DEMO_PORTFOLIO_ECONOMY,
  DEMO_PORTFOLIO_ACTIVITY,
} from "./mock/demoWidgets";
import { PortfolioView } from "./views/PortfolioView";
import { WorkingView, type ResolvedRunner } from "./views/WorkingView";
import { JournalView } from "./views/JournalView";
import { AnalyticsView } from "./views/AnalyticsView";
import { TeamsView } from "./views/TeamsView";
import { CadreView } from "./views/CadreView";
import { SettingsView } from "./views/SettingsView";
import { useFrame } from "./hooks/useFrame";
import { deriveEnforcement } from "./frame/enforcement";
import { phasePastilleFor } from "./theme/roles";
import {
  composeSystemPromptExtra,
  resolveRunnerIdentity,
} from "./frame/identity";
import { TeamPicker } from "./components/TeamPicker";
import { makeAvatarResolver } from "./theme/teamAvatar";
import type { AvatarMember } from "./components/ProjectCard";
import type { DemoTeamMember } from "./mock/demoTeam";
import { backend, type Project, type RunnerEvent } from "./api/backend";
import { removeFromWork } from "./app/removeFromWork";
import { projectsToEagerOpen, decideEagerOpenFocus } from "./app/reconcileEagerOpen";
import { makeDemoFrame } from "./mock/demoFrame";
import "./theme/tokens.css";
// Polices BUNDLÉES (direction A) : Space Grotesk (display) + Inter (texte), woff2
// commités et servis en 'self' (CSP intacte, zero origine Google, offline).
import "./theme/fonts.css";
// Chartes iakagraph embarquees (L14) : un bloc data-theme par charte non-naonedge,
// servi en 'self' via le bundle Vite (build-time) -> CSP intacte, zero inline runtime.
import "./assets/chartes/chartes.css";
import "./theme/app.css";
// Vue « Cadre » (L22) : style scopé sous `.cadre` (refonte ergonomique mock Loki).
import "./theme/cadre.css";
// Page « Analytics » (L30-P1) : style scopé sous `.analytics` (calque mocks analytics/v1..v4).
import "./theme/analytics.css";

/**
 * DÉBRANCHÉ-GARDÉ (décision Stéphane 2026-07-13) : on ARRÊTE de recetter sur de la donnée
 * démo. Ce booléen coupe les TROIS injections de data démo (widgets dérivés, tâches/
 * délégations du panneau, historique de conversation préchargé) → en dev, l'app tourne sur
 * du RÉEL + placeholders honnêtes PARTOUT (comportement prod). L'INFRA du seed `iaka-demo`
 * (mini-repo git réel, config par défaut, UNE conversation ouverte, entrée workset) reste
 * active : on garde un vrai projet à exercer, sans fausse data. Repasser à `true` réactive la
 * vitrine démo — tous les mocks (`demoAnalytics`/`demoWidgets`/`demoTasks`/`demoConversation`)
 * sont CONSERVÉS, juste plus consommés. La garde prod existante est inchangée.
 */
const DEMO_DATA_ENABLED = false;

export default function App(): JSX.Element {
  const { t } = useTranslation();
  const portfolio = usePortfolio();
  const grid = useGridState();
  const conversations = useConversations();
  const teams = useTeams();
  const workset = useWorkset();
  // Statut du job « préparation de reprise » par projet (L23), déclenché au retrait de
  // la Table (le retrait UI n'attend PAS ce job).
  const prepareResume = usePrepareResume();
  const pty = usePty();
  const settings = useSettings();
  const services = useServices();
  const nextStep = useNextStep();
  // L34 — auto-update. UN SEUL exemplaire du hook pour toute l'app : le bandeau et
  // l'écran des Réglages partagent la même machine à états (deux exemplaires =
  // deux contrôles au démarrage). Le contrôle initial est différé et silencieux ;
  // rien ne s'installe sans clic explicite (D3).
  const appUpdate = useAppUpdate();
  // Cadre iakaframe (L22) : autorité du frame.json de la team courante (par défaut la
  // team par défaut ; l'utilisateur change de portée via le sélecteur de la vue Cadre).
  // Semence de démo DEV-gardée (`import.meta.env.DEV`) : si le frame.json de la team par
  // défaut est absent, on pose le cadre d'exemple (non destructif, zéro seed en prod).
  const frame = useFrame(teams.defaultTeamId, backend, (tid) =>
    import.meta.env.DEV && tid !== "" && tid === teams.defaultTeamId
      ? makeDemoFrame(tid)
      : null,
  );
  // Aligne la portée du Cadre sur la team par défaut dès qu'elle est connue (une fois).
  const { teamId: frameTeamId, setTeamId: setFrameTeamId } = frame;
  useEffect(() => {
    if (teams.defaultTeamId && frameTeamId === "") setFrameTeamId(teams.defaultTeamId);
  }, [teams.defaultTeamId, frameTeamId, setFrameTeamId]);

  // i18n : applique la langue persistée (ui_lang) au runtime i18next. `useSettings`
  // reste libre d'i18n (séparation) ; ici on synchronise le moteur sur l'état.
  useEffect(() => {
    if (i18n.language !== settings.lang) void i18n.changeLanguage(settings.lang);
  }, [settings.lang]);

  // Tâches/délégations en cours (panneau « Tâches en cours », Working/colonne droite).
  // Accumule les `RunnerEvent` bruts (besoin du `tool_use_id`, perdu en `ChatTurn`) par
  // projet : `delegation` → tâche running, `activite` du même id → done. La collecte vit
  // dans le hook (pas de god-component) ; le panneau ne reçoit que la liste.
  const agentTasks = useAgentTasks();
  // Économie du tour (L18 #5) : accumule les events `kind:"economie"` du tailer par projet.
  const economy = useEconomy();
  // Effets fichiers (L18 #7) : accumule les gestes d'édition (Edit/Write…) par projet.
  const effects = useEffects();
  // Coût cross-projet (L18 #5b) : agrégation des transcripts → treemap de l'Étagère.
  const portfolioEco = usePortfolioEconomy();
  // Activité « travail passé » (L21 D) : ventilation tokens/jour/projet → scatter-timeline.
  const portfolioAct = usePortfolioActivity();

  // Observateur ADDITIF combiné des events bruts : panneau Tâches (délégations) + HUD
  // économie (tokens) + effets fichiers. Stable (les `ingest` le sont) → pas de
  // re-souscription tailer.
  // L31-P2 — statut « vivant » RÉEL par slot : marque la récence du dernier event du
  // tailer de chaque `projectId` (coordinateur OU slot d'agent) → running/idle dérivé.
  const live = useLiveStatus();

  const ingestRunnerEvent = useCallback(
    (projectId: string, ev: RunnerEvent): void => {
      agentTasks.ingest(projectId, ev);
      economy.ingest(projectId, ev);
      effects.ingest(projectId, ev);
      // L31-P2 : tout event du tailer « ravive » son slot (fraîcheur du flux).
      live.mark(projectId);
    },
    [agentTasks, economy, effects, live],
  );

  // Réf miroir des conversations (lue par `identityFor` ci-dessous ET par `resolveRunner`,
  // défini plus bas) : lit le slot/la source courants sans mettre tout le tableau en
  // dépendance (identité stable → pas de churn de rendu). Déclarée ICI (avant les deux
  // usages) plutôt que dupliquée à chaque point d'appel.
  const convListRef = useRef(conversations.conversations);
  convListRef.current = conversations.conversations;

  // F2 (lot identité du runner, 2026-09-04) — indirection PAR RÉF vers `resolveRunner`
  // (défini plus bas, ligne ~4xx) : `identityFor` doit être une fonction STABLE passée à
  // `useRunnerViews` ICI, avant que `resolveRunner` existe. `identityFor` renvoie le
  // PERSONA réellement injecté (F1) pour ce projet, ou `undefined` si aucune identité n'a
  // atteint le runner (CA-8 : jamais attribuer un nom que le runner ne porte pas).
  //
  // CORRECTIF DE FAIL (gate 🏹 Legolas, 2026-09-04) — `resolveRunner` ignore la SOURCE de
  // la conversation : il répond « identité injectée » dès qu'une team est LIÉE au projet,
  // qu'un runner ait ou non été spawné par ce Cockpit. Or une conversation `attached`
  // (L25) tail un transcript EXTERNE que ce Cockpit n'a JAMAIS informé de rien — aucun
  // `--append-system-prompt` n'a jamais atteint ce process, quelle que soit la liaison de
  // team du projet. Sans ce garde-fou, les tours `geste`/`activite`/`pensee` de ce
  // transcript externe étaient attribués au coordinateur de la team liée : violation de
  // CA-6 et du repli § 6 F1 de l'instruction (« … ou `source:"attached"` → `""` »). On
  // coupe donc AVANT toute consultation de `resolveRunner` : une conversation `attached`
  // ne reçoit jamais d'attribution, point final — indépendamment de tout ce que
  // `resolveRunner` calculerait par ailleurs.
  const resolveRunnerRef = useRef<((projectId: string) => ResolvedRunner) | null>(null);
  const identityFor = useCallback((projectId: string): string | undefined => {
    const conv = convListRef.current.find((c) => c.projectId === projectId);
    if (conv?.source === "attached") return undefined;
    const r = resolveRunnerRef.current?.(projectId);
    return r?.identityInjected ? r.coordinator : undefined;
  }, []);

  // Vue filtrée L10b : le tailer du transcript du chef-runner alimente les
  // conversations (runner://event → ChatTurn). Démarré dès qu'un runnerSessionId
  // apparaît dans une session PTY. Le parse vit côté Rust (CSP) ; ici on ne route que
  // des events typés vers l'état conversation. `onEvent` est l'observateur ADDITIF des
  // events bruts (tool_use_id préservé) pour les panneaux Tâches + Économie.
  useRunnerViews({
    conversations: conversations.conversations,
    ptySessions: pty.sessions,
    appendTurn: conversations.appendTurn,
    onEvent: ingestRunnerEvent,
    identityFor,
  });

  // Bootstrap démo dev (L7, réconcilié L8/D7) : seede dossier+config côté Rust
  // (inerte en prod) puis ouvre UNE conversation pour le projet démo (plus 5
  // onglets) si aucune conversation active. Reste sur Portfolio (AR-4). L11 : après
  // le seed, on relit la config team (le seed a posé `project_team:iaka-demo` côté
  // Rust → la démo s'ouvre sans popup même au ré-accès depuis la worklist).
  // Vitrine des widgets dérivés (L18) : activé par le seed démo (dev) → App substitue les
  // données de démo (Plan/Économie/Mémoire/Effets) si aucune donnée LIVE pour `iaka-demo`.
  const [demoWidgetsOn, setDemoWidgetsOn] = useState(false);

  useDemoSeed({
    conversationsCount: conversations.conversations.length,
    openConversation: conversations.openConversation,
    refreshPortfolio: portfolio.refresh,
    // L9-B : le projet démo entre aussi dans le set de Work (idempotent).
    addToWorkset: workset.add,
    onSeeded: () => void teams.reload(),
    // L11 : route la conversation démo vers le coordinateur RÉSOLU de sa team (plus le
    // littéral) — un changement de coordinateur de la team par défaut s'y reflète.
    resolveCoordinator: (projectId) =>
      teams.coordinatorOf(teams.teamForProject(projectId))?.name,
    // L-taches : précharge les délégations de démo dans le panneau « Tâches en cours »
    // (vitrine) pour le seul `iaka-demo`. Démo-only (gardé par le flag dev du seed).
    seedTasks: agentTasks.seed,
    onDemoWidgets: () => setDemoWidgetsOn(true),
    // Débranché-gardé (2026-07-13) : coupe les 3 injections de data démo (historique de
    // conversation, tâches, widgets). L'infra du seed reste active. `seedTasks`/`onDemoWidgets`
    // ci-dessus restent branchés mais ne sont PLUS appelés quand `demoData=false`.
    demoData: DEMO_DATA_ENABLED,
  });

  // Projets du set de Work (intersection ids ⨯ projets réels).
  const worksetProjects = useMemo<Project[]>(
    () => portfolio.projects.filter((p) => workset.ids.has(p.id)),
    [portfolio.projects, workset.ids],
  );

  // L21/A — chip statut « ● en cours » : projets ayant une conversation VIVANTE (AR-2).
  const liveProjectIds = useMemo(
    () => new Set(conversations.conversations.map((c) => c.projectId)),
    [conversations.conversations],
  );

  // L21/A — avatars d'une carte = roster de la team DU PROJET (pas la team active),
  // vignettes résolues suivant la charte ACTIVE (`settings.theme`). Fallback pastille
  // si la vignette est absente (`url:null`). Réutilise `makeAvatarResolver` par projet.
  const avatarsForProject = useCallback(
    (projectId: string): AvatarMember[] => {
      const team = teams.teamForProject(projectId);
      const resolve = makeAvatarResolver(
        settings.theme,
        team.vignetteTeam,
        team.agents,
      );
      return team.agents.map((a) => ({
        name: a.name,
        royaume: a.royaume,
        url: resolve(a.name),
      }));
    },
    [teams, settings.theme],
  );

  // Popup de liaison projet↔team (L11) : projet en attente de choix de team.
  const [pickerProject, setPickerProject] = useState<Project | null>(null);

  // L26 — mode focus de la Table (toggle plein écran des onglets). `true` = colonnes de
  // gauche masquées (rail App + worklist WorkingView) + zone de travail agrandie. Transitoire
  // (pas de persistance — hors lot). UN seul toggle SYMÉTRIQUE (révision recette
  // 2026-07-13) : activer = entrer en focus ET passer en plein écran OS ; désactiver =
  // colonnes rétablies ET sortie du plein écran (via la façade unique `set_fullscreen`,
  // D7). L'état `workFocus` pilote colonnes et fullscreen d'un seul geste.
  const [workFocus, setWorkFocus] = useState(false);
  const toggleWorkFocus = useCallback((): void => {
    setWorkFocus((prev) => {
      const next = !prev;
      void backend.setFullscreen(next);
      return next;
    });
  }, []);

  // Taille de police du terminal : le BORNAGE vit ici, en source unique, et pas dans chaque
  // appelant — la barre d'onglets et les Réglages émettent tous deux une taille voulue, que
  // `clampTermFontSize` ramène dans [TERM_FONT_MIN, TERM_FONT_MAX]. Conséquence voulue :
  // marteler `A+` sature à la borne au lieu de fabriquer un terminal à 3 colonnes.
  const setTermFontSize = useCallback(
    (size: number): void => {
      void settings.setUiPref("termFontSize", clampTermFontSize(size));
    },
    [settings],
  );

  // Vrai id de projet de la conversation active (L31-P1) : un SLOT d'agent a un
  // `projectId` synthétique → on lit `slot.realProjectId` pour que team/avatars/roster
  // restent ceux du VRAI projet. Coordinateur : `slot` absent → `projectId` = vrai projet.
  const activeRealProjectId =
    conversations.active?.slot?.realProjectId ??
    conversations.active?.projectId ??
    "";

  // Team du projet ACTIF (L11) : pilote les vignettes ET le roster. Hors conversation
  // active → team par défaut (`teamForProject("")` retombe sur le défaut).
  const activeTeam = useMemo(
    () => teams.teamForProject(activeRealProjectId),
    [teams, activeRealProjectId],
  );

  // L31-P1 — agents lançables (runner exécutable) de la team active, noms MINUSCULES.
  // Alimente le roster (bouton « lancer » désactivé pour un runner défini-non-câblé).
  const launchableAgents = useMemo(
    () =>
      new Set(
        activeTeam.agents
          .filter((a) => isExecutableRunner(a.runner))
          .map((a) => a.name.toLowerCase()),
      ),
    [activeTeam],
  );

  // Résolveur d'avatar (L9, reframé L11) : charte = thème app, casting + roster = team
  // du projet ACTIF (plus la globale `ui_team`). Passé en prop aux présentationnels.
  const resolveAvatar = useMemo(
    () =>
      makeAvatarResolver(
        settings.theme,
        activeTeam.vignetteTeam,
        activeTeam.agents,
      ),
    [settings.theme, activeTeam],
  );

  // Roster du projet actif (L11) : agents de la team → membres `[ROYAUME][Agent]`.
  const rosterMembers = useMemo<DemoTeamMember[]>(
    () =>
      activeTeam.agents.map((a) => ({
        royaume: a.royaume,
        agent: a.name,
        roleIndex: a.roleIndex,
      })),
    [activeTeam],
  );

  // Plan vivant (L18 #3) : conv_id = dernier segment du cwd de l'atelier actif (calque
  // de l'émetteur hook `plan-courante.mjs`). Lu depuis la main courante (façade L4).
  const activePlanProject = useMemo(() => {
    const cwd = conversations.active?.cwd;
    return cwd ? (cwd.split("/").filter(Boolean).pop() ?? null) : null;
  }, [conversations.active]);
  const plan = usePlan(activePlanProject);

  // Données des widgets dérivés (Plan/Économie/Mémoire/Effets) AVEC fallback DÉMO : si le
  // projet actif est `iaka-demo`, que le seed dev a eu lieu et qu'aucune donnée LIVE
  // n'existe, on substitue les données de démo (vitrine). Inerte en prod (pas d'iaka-demo).
  const activeProjectId = conversations.active?.projectId ?? null;
  const demoActive = demoWidgetsOn && activeProjectId === DEMO_PROJECT_ID;
  const liveEconomy = activeProjectId ? economy.seriesFor(activeProjectId) : [];
  const liveEffectsState = activeProjectId
    ? effects.effectsFor(activeProjectId)
    : { total: 0, byPath: {} };
  const liveEffects = sortedEffects(liveEffectsState);
  const planItemsView =
    plan.items && plan.items.length > 0
      ? plan.items
      : demoActive
        ? DEMO_PLAN
        : plan.items;
  const economyView =
    liveEconomy.length > 0 ? liveEconomy : demoActive ? DEMO_ECONOMY : liveEconomy;
  const effectsView =
    liveEffects.length > 0 ? liveEffects : demoActive ? DEMO_EFFECTS : liveEffects;
  const effectsTotalView =
    liveEffects.length > 0
      ? liveEffectsState.total
      : demoActive
        ? DEMO_EFFECTS_TOTAL
        : liveEffectsState.total;
  // Gantt prévisionnel (L19 #9a/#9b) : timeline dérivée des snapshots de plan, ou démo.
  // `now` est TICKÉ (L20 B1, `useNow`) — pas un `Date.now()` figé au render : les barres
  // `in_progress` grandissent, le curseur avance et le dépassement vire au rouge au fil du
  // temps, sans rechargement. En pause quand l'onglet est masqué (cf. `useNow`).
  const now = useNow();
  const timelineView =
    plan.snapshots.length > 0
      ? derivePlanTimeline(plan.snapshots, now)
      : demoActive
        ? DEMO_TIMELINE
        : derivePlanTimeline([], now);

  // L31-P2 — statut vivant RÉEL du roster (par agent de la team active) : `running`/`idle`
  // si un slot de l'agent existe et son tailer est frais/silencieux, `none` sinon (non
  // lancé). Le coordinateur = son slot principal (la conversation du projet). Recalculé au
  // tick `now` (useNow) → le statut « respire » sans backend. Zéro fausse donnée.
  const activeCoordinatorName = useMemo(
    () => teams.coordinatorOf(activeTeam)?.name,
    [teams, activeTeam],
  );
  const rosterLiveStatus = useMemo(
    () =>
      deriveRosterLiveStatus(
        rosterMembers,
        activeRealProjectId,
        activeCoordinatorName,
        liveProjectIds,
        live.lastEventAt,
        now,
      ),
    [
      rosterMembers,
      activeRealProjectId,
      activeCoordinatorName,
      liveProjectIds,
      live.lastEventAt,
      now,
    ],
  );

  // L31-P2 — statut vivant par ONGLET (slot ouvert) : running/idle pour le point discret.
  const tabLiveStatus = useMemo(() => {
    const out: Record<string, "running" | "idle"> = {};
    for (const c of conversations.conversations) {
      out[c.projectId] = deriveLiveStatus(live.lastEventAt[c.projectId], now);
    }
    return out;
  }, [conversations.conversations, live.lastEventAt, now]);

  // Runner+modèle+coordinateur d'une conversation (L11/P3) : résolus depuis SA team.
  // C'est le COORDINATEUR qui porte le runner/modèle (plus de `claude-code` en dur).
  // L31-P1 — pour un SLOT D'AGENT (conversation avec `slot`), le runner/modèle = ceux de
  // l'agent lui-même, et l'enforcement du Cadre est dérivé pour CET agent (pas le coord).
  //
  // Identité du runner (lot 2026-09-04, `identite-du-runner-badge-et-team.md`) — AR-1=(b) :
  // la team liée pilotait déjà TOUT ce que le Cockpit AFFICHE, mais ne disait RIEN au
  // runner : `systemPromptExtra` ne portait que l'extra du Cadre (souvent vide). Le
  // process `claude` sommé de produire un badge en inventait un (« claude »). On préfixe
  // désormais un préambule d'identité PUR (`identityPreamble`) — persona = coordinateur
  // (ou agent du slot), royaume = **id du projet en MAJUSCULES** (AR-6, jamais
  // `agent.royaume`, qui porte la clé de RÔLE — cf. § AR-6 de l'instruction). AR-4 :
  // **zéro injection sans liaison explicite** (`teams.hasBinding`) — un projet non lié
  // retombe SILENCIEUSEMENT sur la team par défaut côté affichage (comportement L11
  // inchangé), mais ne reçoit AUCUNE identité fabriquée. `identityInjected` (F3) reflète
  // ce qui a RÉELLEMENT atteint `systemPromptExtra` — codex exclu structurellement
  // (`codex_args` ne porte pas de system-prompt, cf. `frame/identity.ts` § hors couverture).
  const resolveRunner = useCallback(
    (slotId: string): ResolvedRunner => {
      const slot = convListRef.current.find(
        (c) => c.projectId === slotId,
      )?.slot;
      if (slot) {
        const team = teams.teamForProject(slot.realProjectId);
        let allowedTools: string | undefined;
        let cadreExtra: string | undefined;
        if (team && frame.frame.teamId === team.id) {
          const enf = deriveEnforcement(frame.frame, slot.agent);
          allowedTools = enf.allowedTools ?? undefined;
          cadreExtra = enf.systemPromptExtra || undefined;
        }
        // F1 — identité DE L'AGENT du slot (pas du coordinateur, CA-4). Pastille (lot
        // « Pastille du badge du runner », F3) : dérivée du rôle de CET agent, retrouvé
        // dans la team par son nom — CA-5, agent introuvable ⇒ `undefined`, jamais celle
        // du coordinateur.
        const slotAgent = team ? teams.agentInTeam(team, slot.agent) : null;
        const { identity, identityInjected } = resolveRunnerIdentity({
          hasBinding: teams.hasBinding(slot.realProjectId),
          persona: slot.agent,
          projectId: slot.realProjectId,
          runnerKind: slot.runner,
          pastille: phasePastilleFor(slotAgent?.royaume, slotAgent?.roleIndex),
        });
        const systemPromptExtra =
          composeSystemPromptExtra(identity, cadreExtra) || undefined;
        return {
          kind: slot.runner,
          model: slot.model,
          coordinator: slot.agent,
          allowedTools,
          systemPromptExtra,
          identityInjected,
        };
      }
      const projectId = slotId;
      const team = teams.teamForProject(projectId);
      const coord = teams.coordinatorOf(team);
      // L22-P3 — enforcement du Cadre. On dérive allowlist + system-prompt du coordinateur
      // UNIQUEMENT quand le Cadre chargé (`frame.frame`) est bien celui de la team du projet
      // (le hook `useFrame` porte UN cadre à la fois, aligné sur la team par défaut / la
      // portée du sélecteur Cadre). Sinon → repli global (undefined = zéro régression). Le
      // Cadre se charge en asynchrone : si le runner a déjà spawné avant, le repli global
      // tient (spawn idempotent, cf. PtyTerminal) — limitation documentée (différé).
      let allowedTools: string | undefined;
      let cadreExtra: string | undefined;
      if (team && coord?.name && frame.frame.teamId === team.id) {
        const enf = deriveEnforcement(frame.frame, coord.name);
        allowedTools = enf.allowedTools ?? undefined;
        cadreExtra = enf.systemPromptExtra || undefined;
      }
      const runnerKind = coord?.runner ?? "claude-code";
      // F1/AR-4 — pas de liaison EXPLICITE → aucune identité (zéro fabrication), même si
      // `teamForProject`/`coordinatorOf` retombent silencieusement sur la team par défaut.
      // Pastille (F3) : `coord` porte déjà `royaume`/`roleIndex`, aucun `agentInTeam` requis.
      const { identity, identityInjected } = resolveRunnerIdentity({
        hasBinding: teams.hasBinding(projectId),
        persona: coord?.name,
        projectId,
        runnerKind,
        pastille: phasePastilleFor(coord?.royaume, coord?.roleIndex),
      });
      const systemPromptExtra =
        composeSystemPromptExtra(identity, cadreExtra) || undefined;
      return {
        kind: runnerKind,
        model: coord?.model ?? "",
        coordinator: coord?.name ?? "—",
        allowedTools,
        systemPromptExtra,
        identityInjected,
      };
    },
    [teams, frame.frame],
  );
  // Referme l'indirection F2 posée plus haut (`identityFor`) : réf à jour à CHAQUE render.
  resolveRunnerRef.current = resolveRunner;

  // Ouvre la conversation d'un projet en routant vers le COORDINATEUR de sa team.
  // L25 — AVANT d'ouvrir, on détecte la SESSION VIVANTE du projet (`latest_transcript`) :
  //   - un transcript existe → ouverture en mode **`attached`** (vue live LECTURE SEULE,
  //     SANS `pty_runner_open` : le tailer démarre sur ce transcript externe) ;
  //   - aucun → comportement historique `owned` (spawn du runner par `PtyTerminal`).
  // Idempotent : si la conversation existe déjà, on la ré-active sans re-détecter (évite un
  // appel façade inutile + préserve l'ouverture eager L24). Async ; hors Tauri, la façade
  // retombe en erreur → capturée → ouverture `owned` (aucune régression front pur/tests).
  // L37 F2 — `focus` (défaut `true`) : le chemin de RESTAURATION de la Table au boot
  // ouvre les conversations SANS naviguer (AR-1 = (c)) ; tout appel utilisateur (clic,
  // pose sur la table, treemap L16-F2) garde le comportement historique inchangé.
  const openConversationFor = useCallback(
    async (project: Project, teamId?: string, focus = true): Promise<void> => {
      const already = conversations.conversations.some(
        (c) => c.projectId === project.id,
      );
      if (already) {
        conversations.setActive(project.id);
        if (focus) grid.setActiveView("working");
        return;
      }
      const team = teamId
        ? (teams.teams.find((t) => t.id === teamId) ??
          teams.teamForProject(project.id))
        : teams.teamForProject(project.id);
      const coord = teams.coordinatorOf(team);

      let attach: { sessionId: string; transcriptPath: string } | undefined;
      try {
        const latest = await backend.latestTranscript(project.path);
        if (latest) {
          attach = { sessionId: latest.session_id, transcriptPath: latest.path };
        }
      } catch {
        // Hors Tauri / erreur : pas d'attache → ouverture owned (dégradation propre).
      }

      conversations.openConversation(
        project.id,
        project.id,
        project.path,
        coord?.name,
        undefined,
        attach,
      );
      if (focus) grid.setActiveView("working");
    },
    [teams, conversations, grid],
  );

  // Ouverture d'un projet : popup de liaison si pas de team liée (L11 § 5.2), sinon
  // ouverture directe (interlocuteur = coordinateur de la team liée).
  const openProject = (project: Project): void => {
    if (!teams.hasBinding(project.id)) {
      setPickerProject(project);
      return;
    }
    void openConversationFor(project);
  };

  // L24 F1 — Ouverture EAGER des fenêtres de travail. Réconcilie `workset → conversations`
  // ouvertes : dès qu'un projet DÉJÀ LIÉ est posé sur la Table sans conversation, on ouvre
  // sa fenêtre (runner/PTY vivant) sans attendre un clic. Bornes (anti-boucle / anti-popup) :
  //   - seulement les projets LIÉS (`hasBinding`) → un projet non lié garde sa présence en
  //     worklist mais n'ouvre le `TeamPicker` qu'au clic (AR-3, pas d'empilement de popups) ;
  //   - seulement ceux SANS conversation (`liveProjectIds`) → idempotent : la conversation
  //     créée retombe dans `liveProjectIds` au tour suivant → toOpen se vide (convergence) ;
  //   - un retrait (removeFromWorkAndPrepare) sort le projet de `worksetProjects` AVANT que
  //     l'effet ne rejoue → aucune réouverture dans le même tour.
  // L37 F2 — le PREMIER passage qui suit la fin du BOOT n'a pas le droit de voler le
  // focus (AR-1 = (c)) : la Table se repeuple, mais l'app reste sur la vue courante
  // (Portefeuille au boot). Tout passage ultérieur (pose utilisateur) navigue comme
  // avant — décision extraite en fonction PURE (`decideEagerOpenFocus`), mémorisée par
  // une réf (l'effet n'est pas rejoué pour ça). `openConversationFor` est appelé
  // directement (pas `openProject`) : les projets de ce lot sont déjà LIÉS par
  // construction (filtrés par `projectsToEagerOpen`), donc le chemin `TeamPicker`
  // d'`openProject` ne s'applique pas ici.
  // L37-CA6 (correctif, recette réelle du 2026-09-04) — le boot dépend de DEUX
  // sources asynchrones indépendantes, pas d'une seule : `workset.loaded` (lecture
  // config, rapide) ET `portfolio.loaded` (parcours disque, plus lent). Ne regarder
  // que la première fermait la fenêtre de restauration alors que `worksetProjects`
  // (l'intersection des deux) était encore vide faute du portefeuille — le lot ouvert
  // par le scan arrivé plus tard volait alors le focus. `bootReady` = ET logique des
  // deux ; un scan en ERREUR clôt aussi le boot (`usePortfolio.loaded` posé dans son
  // `finally`, succès et erreur confondus) — une Table qui ne se peuplera jamais ne
  // doit pas laisser la fenêtre ouverte indéfiniment.
  // Lu via ref pour ne pas être mis en dépendance (sinon l'effet se ré-abonnerait à
  // chaque render). Réconcilie `useDemoSeed` : `iaka-demo` est ouvert par le seed AVANT
  // d'entrer dans le workset → déjà dans `liveProjectIds` → jamais rouvert ici (pas de
  // double ouverture, reste sur Portfolio — AR-4 préservé).
  const openConversationForRef = useRef(openConversationFor);
  openConversationForRef.current = openConversationFor;
  const eagerFocusStateRef = useRef({ restorationConsumed: false });
  const bootReady = workset.loaded && portfolio.loaded;
  useEffect(() => {
    const toOpen = projectsToEagerOpen({
      worksetProjects,
      openConversationIds: liveProjectIds,
      hasBinding: teams.hasBinding,
    });
    const { focus, nextState } = decideEagerOpenFocus(
      bootReady,
      eagerFocusStateRef.current,
    );
    eagerFocusStateRef.current = nextState;
    for (const p of toOpen) void openConversationForRef.current(p, undefined, focus);
  }, [worksetProjects, liveProjectIds, teams.hasBinding, bootReady]);

  // L16-F2 — double-clic sur une cellule de la treemap Économie (Portefeuille) : bascule sur
  // Travail avec le projet au premier plan. Navigation + focus SEULEMENT (la treemap est
  // scopée table → le projet est déjà sur la table ; AUCUNE mutation du workset). Réutilise
  // `openProject` (ouvre/active la conversation) puis force la vue Travail.
  const openInWork = (projectId: string): void => {
    const project = worksetProjects.find((p) => p.id === projectId);
    if (!project) return;
    openProject(project);
    grid.setActiveView("working");
  };

  // Analytics — nom du coordinateur d'un projet, pour l'attribution PAR PROJET de la conso parent
  // (fix Odin/Aragorn). Un projet EXPLICITEMENT lié à une team → le coordinateur de CETTE team
  // (ex. Aragorn pour iakacockpit) ; un projet NON lié (racine/portefeuille) → "Odin" (coordination
  // portefeuille par défaut). Ainsi ALL n'agrège plus tous les projets sous un seul nom. La logique
  // teams reste ICI (App a `teams`) ; AnalyticsView ne fait que router par nom.
  const coordinatorOfProject = (projectId: string): string => {
    if (!teams.hasBinding(projectId)) return "Odin";
    const team = teams.teamForProject(projectId);
    return teams.coordinatorOf(team)?.name ?? "Odin";
  };

  // Entrée partagée (L10b/§5.1) : la saisie chat ÉCHOTE (tour user) ET PILOTE le chef
  // (stdin du PTY : la frappe + `\r` pour soumettre la TUI native). Le `@agent` est un
  // préfixe VERBATIM (arbitrage #5) : `content` est écrit tel quel au PTY, aucune
  // traduction. La réponse du chef remonte par le tailer (`useRunnerViews`).
  const handleSend = (projectId: string, agent: string, content: string): void => {
    const conv = conversations.conversations.find(
      (c) => c.projectId === projectId,
    );
    if (!conv) return;
    // L25 — LECTURE SEULE STRICTE en `attached` : on n'écrit JAMAIS vers une session
    // externe (zéro conflit deux-process). La saisie chat est déjà désactivée côté UI ;
    // cette garde verrouille le contrat même si un chemin d'envoi était appelé.
    if (conv.source === "attached") return;
    conversations.echoUser(projectId, agent, content);
    void pty.write(conv.ptySessionId, `${content}\r`);
  };

  // L25 — « démarrer un runner du cockpit » : bascule une conversation `attached` en
  // `owned`. On ARRÊTE d'abord le tailer externe (`transcript_tail_stop`), puis on flippe
  // la source → au prochain rendu, `WorkingView` monte le `PtyTerminal` (spawn du runner)
  // et `useRunnerViews` démarre le tailer de la NOUVELLE session. Reste sur la conversation
  // active. Aucun `pty.close` (l'attaché n'avait pas de PTY).
  const startRunnerForActive = (projectId: string): void => {
    const conv = conversations.conversations.find(
      (c) => c.projectId === projectId,
    );
    if (!conv || conv.source !== "attached") return;
    if (conv.attachedSessionId) {
      void backend.transcriptTailStop(conv.attachedSessionId);
    }
    conversations.convertToOwned(projectId);
  };

  // L31-P1 — lancer un agent de la team ACTIVE comme SON runner réel (slot propre au
  // projet), depuis le roster. Résout le VRAI projet de la conversation active (un slot
  // d'agent hérite du projet réel via `slot.realProjectId`) puis :
  //   - agent = coordinateur → il tourne DÉJÀ comme slot principal → on ré-active sa
  //     conversation (pas de slot redondant) ;
  //   - runner non exécutable → no-op (le bouton roster est déjà désactivé — double garde) ;
  //   - sinon → ouvre un slot d'agent `owned` (idempotent : ré-active si déjà ouvert). Le
  //     PTY est spawné par `WorkingView` (garde L10 : monté une fois, jamais démonté).
  const launchAgentSlot = (agent: string): void => {
    const active = conversations.active;
    if (!active) return;
    const realProjectId = active.slot?.realProjectId ?? active.projectId;
    const team = teams.teamForProject(realProjectId);
    const coord = teams.coordinatorOf(team);
    const ag = teams.agentInTeam(team, agent);
    if (!ag) return;
    if (coord && ag.id === coord.id) {
      // Le coordinateur = slot principal (la conversation du projet) : la ré-activer.
      conversations.setActive(realProjectId);
      return;
    }
    if (!isExecutableRunner(ag.runner)) return; // garde (bouton désactivé côté roster)
    const project = worksetProjects.find((p) => p.id === realProjectId);
    const cwd = project?.path ?? active.cwd;
    conversations.openAgentSlot(realProjectId, cwd, ag.name, ag.runner, ag.model);
  };

  // Bouton + de Working : import d'un dossier existant → portfolio + set de Work.
  const addProject = async (): Promise<void> => {
    const project = await portfolio.importProject();
    if (project) workset.add(project.id);
  };

  // L23 — « retirer de la table ». Décision 1/2 (VERROUILLÉE) : le retrait est
  // IMMÉDIAT (l'UI n'attend pas) ET déclenche SYSTÉMATIQUEMENT le job de préparation de
  // reprise EN TÂCHE DE FOND (sans await — décision 3, aucune échappatoire). L'orchestration
  // vit ICI (App), pas dans useWorkset (le set d'ids reste front-pur, sans I/O).
  const removeFromWorkAndPrepare = (projectId: string): void => {
    const project = worksetProjects.find((p) => p.id === projectId);
    // Capturer la conversation AVANT de la retirer (pour lire son ptySessionId).
    const conv = conversations.conversations.find(
      (c) => c.projectId === projectId,
    );
    // L31-P2 — capturer les SLOTS D'AGENTS du MÊME projet (slot.realProjectId === projectId)
    // pour les fermer EN CASCADE (PTY + conversation) : sinon ils restent orphelins (PTY
    // vivant, onglet orphelin) au retrait du coordinateur. Ne concerne QUE ce projet.
    const agentSlots = conversations.conversations
      .filter((c) => c.slot?.realProjectId === projectId)
      .map((c) => ({
        projectId: c.projectId,
        ptySessionId: c.ptySessionId,
        executable: isExecutableRunner(c.slot!.runner),
      }));
    // Orchestration pure (retrait + reprise + fermeture PTY/conversation, cf.
    // removeFromWork). Fermer le PTY EXPLICITEMENT puis retirer la conversation :
    // le PtyTerminal se démonte APRÈS la fermeture (plus de PTY orphelin). Garde
    // L10 non violée : ce chemin explicite libère la garde de spawn R-L10b-1 ; le
    // toggle/nav ne ferme jamais.
    removeFromWork({
      projectId,
      project,
      conversation: conv,
      toggleWork: workset.toggle,
      prepareResume: prepareResume.prepare,
      closePty: pty.close,
      // L25 — session attachée : arrêt du tailer externe (jamais de pty.close).
      stopTailer: backend.transcriptTailStop,
      closeConversation: conversations.closeConversation,
      // L31-P2 — fermeture en cascade des slots d'agents du projet retiré.
      agentSlots,
    });
  };

  // L31-P1 — fermeture d'un ONGLET (× de ProjectTabs). Dispatche selon la nature :
  //   - SLOT D'AGENT (conversation avec `slot`) → ferme SON pty (fermeture explicite,
  //     sanctionnée hors garde L10) puis retire SA conversation ; ne touche NI au workset
  //     NI au job de reprise (ce n'est pas un projet) ;
  //   - COORDINATEUR (= le projet) → retrait de la Table L23 (comportement historique).
  const closeTab = (projectId: string): void => {
    const conv = conversations.conversations.find(
      (c) => c.projectId === projectId,
    );
    if (conv?.slot) {
      if (isExecutableRunner(conv.slot.runner)) void pty.close(conv.ptySessionId);
      conversations.closeConversation(projectId);
      return;
    }
    removeFromWorkAndPrepare(projectId);
  };

  return (
    <main
      className={`app-shell${workFocus ? " app-shell--focus" : ""}`}
      data-navpos={settings.ui.navPos}
    >
      {/* Direction A : rail de navigation vertical (Portfolio / Working / Journal /
          Teams en TEXTE + Réglages en icône ⚙, en pied) — REMPLACE la barre
          d'onglets-pilule. La nav reste pilotée par useGridState (ViewId inchangé) ;
          seul le RENDU du sélecteur change. Décision Stéphane : libellés texte (rail
          nettoyé de ses icônes), seul Réglages garde une icône. */}
      <nav className="rail rail-text" aria-label={t("nav.ariaLabel")}>
        <div className="brand" aria-hidden>
          i
        </div>
        <div className="brandsub" aria-hidden>
          {t("nav.brand")}
        </div>
        <button
          type="button"
          className={`railitem${grid.activeView === "portfolio" ? " on" : ""}`}
          aria-current={grid.activeView === "portfolio" ? "page" : undefined}
          onClick={() => grid.setActiveView("portfolio")}
        >
          <span className="rlabel">{t("nav.portfolio")}</span>
        </button>
        <button
          type="button"
          className={`railitem${grid.activeView === "working" ? " on" : ""}`}
          aria-label={t("nav.working")}
          aria-current={grid.activeView === "working" ? "page" : undefined}
          onClick={() => grid.setActiveView("working")}
        >
          <span className="rlabel">{t("nav.working")}</span>
          {conversations.conversations.length > 0 && (
            <span className="nu">{conversations.conversations.length}</span>
          )}
        </button>
        {/* L30-P1 — le bouton rail « Journal » est remplacé par « Analytics ». Journal reste
            DÉBRANCHÉ-GARDÉ (JournalView, MainCourante, la route et le membre "journal" de
            ViewId sont conservés — comme « Cadre ») : seule la CIBLE du bouton change. */}
        <button
          type="button"
          className={`railitem${grid.activeView === "analytics" ? " on" : ""}`}
          aria-current={grid.activeView === "analytics" ? "page" : undefined}
          onClick={() => grid.setActiveView("analytics")}
        >
          <span className="rlabel">{t("nav.analytics")}</span>
        </button>
        <button
          type="button"
          className={`railitem${grid.activeView === "teams" ? " on" : ""}`}
          aria-current={grid.activeView === "teams" ? "page" : undefined}
          onClick={() => grid.setActiveView("teams")}
        >
          <span className="rlabel">{t("nav.teams")}</span>
        </button>
        {/* Page « Cadre » débranchée du rail sur demande (2026-07-12) : bouton retiré
            de la navigation, mais tout le code Cadre est CONSERVÉ (CadreView, useFrame,
            route, CSS, membre "cadre" de ViewId). Re-poser ce bouton la réactive. */}
        <div className="sep" />
        {/* Nav vocale retirée du rail (2026-07-02) : le vocal est désormais une dictée
            DANS le chat (WorkingView), pas un pilote de navigation. */}
        <button
          type="button"
          className={`railitem${grid.activeView === "settings" ? " on" : ""}`}
          aria-current={grid.activeView === "settings" ? "page" : undefined}
          onClick={() => grid.setActiveView("settings")}
        >
          <span className="rlabel">{t("nav.settings")}</span>
        </button>
      </nav>

      <div className="host">
        {grid.activeView === "portfolio" && (
          <PortfolioView
            projects={portfolio.projects}
            loading={portfolio.loading}
            error={portfolio.error}
            root={portfolio.root}
            worksetIds={workset.ids}
            worksetCount={workset.ids.size}
            onToggleWork={workset.toggle}
            onGotoWork={() => grid.setActiveView("working")}
            liveProjectIds={liveProjectIds}
            avatarsForProject={avatarsForProject}
            economy={
              portfolioEco.length > 0
                ? portfolioEco
                : demoWidgetsOn
                  ? DEMO_PORTFOLIO_ECONOMY
                  : []
            }
            activity={
              portfolioAct.length > 0
                ? portfolioAct
                : demoWidgetsOn
                  ? DEMO_PORTFOLIO_ACTIVITY
                  : []
            }
            onOpenInWork={openInWork}
          />
        )}
        {grid.activeView === "working" && (
          <WorkingView
            worksetProjects={worksetProjects}
            conversations={conversations.conversations}
            active={conversations.active}
            pty={pty}
            nextStepResult={nextStep.result}
            nextStepLoading={nextStep.loading}
            nextStepError={nextStep.error}
            onOpenProject={openProject}
            onAddProject={() => void addProject()}
            onRemoveFromWork={removeFromWorkAndPrepare}
            prepareEntries={prepareResume.entries}
            onDismissPrepare={prepareResume.dismiss}
            onSelectConversation={conversations.setActive}
            onCloseTab={closeTab}
            onLaunchAgent={launchAgentSlot}
            launchableAgents={launchableAgents}
            onSetMode={conversations.setMode}
            onSetAgent={conversations.setAgent}
            onSend={handleSend}
            onStartRunner={startRunnerForActive}
            onRequestNextStep={(path) => void nextStep.request(path)}
            resolveAvatar={resolveAvatar}
            rosterMembers={rosterMembers}
            tasks={
              conversations.active
                ? agentTasks.tasksFor(conversations.active.projectId)
                : []
            }
            planItems={planItemsView}
            economySeries={economyView}
            fileEffects={effectsView}
            fileEffectsTotal={effectsTotalView}
            timeline={timelineView}
            resolveRunner={resolveRunner}
            teamsLoaded={teams.loaded}
            hidePensee={settings.hidePensee}
            onToggleHidePensee={() =>
              void settings.setHidePensee(!settings.hidePensee)
            }
            focus={workFocus}
            onToggleFocus={toggleWorkFocus}
            termFontSize={settings.ui.termFontSize}
            onTermFontSize={setTermFontSize}
            rosterLiveStatus={rosterLiveStatus}
            tabLiveStatus={tabLiveStatus}
          />
        )}
        {/* Journal débranché-gardé (L30-P1) : la route reste, seul le bouton rail a changé. */}
        {grid.activeView === "journal" && <JournalView />}
        {grid.activeView === "analytics" && (
          <AnalyticsView
            economy={portfolioEco}
            activity={portfolioAct}
            demoOn={demoWidgetsOn}
            coordinatorOfProject={coordinatorOfProject}
          />
        )}
        {grid.activeView === "teams" && (
          <TeamsView teams={teams} theme={settings.theme} />
        )}
        {grid.activeView === "cadre" && (
          <CadreView frame={frame} teams={teams.teams} />
        )}
        {grid.activeView === "settings" && (
          <SettingsView
            settings={settings}
            services={services.services}
            onRescan={() => void portfolio.refresh()}
            updateState={appUpdate.state}
            appVersion={appUpdate.currentVersion}
            onCheckUpdate={() => void appUpdate.check(true)}
          />
        )}
      </div>

      {/* L34 — bandeau de mise à jour : discret, non modal, hors du flux des vues.
          Ne rend rien tant qu'aucune version n'est disponible (et RIEN du tout en
          cas d'échec du contrôle au démarrage : une box éteinte ne se voit pas). */}
      <UpdateBanner
        state={appUpdate.state}
        dismissed={appUpdate.dismissed}
        onInstall={() => void appUpdate.install()}
        onDismiss={appUpdate.dismiss}
      />

      {/* Popup de liaison projet↔team (L11 § 5.2) — affiché si pas de liaison. */}
      {pickerProject && (
        <TeamPicker
          projectLabel={pickerProject.id}
          teams={teams.teams}
          defaultTeamId={teams.defaultTeamId}
          onConfirm={(teamId) => {
            const project = pickerProject;
            setPickerProject(null);
            void teams
              .bindProjectTeam(project.id, teamId)
              .then(() => openConversationFor(project, teamId));
          }}
          onCancel={() => {
            // N'écrit RIEN : ouvre avec la team par défaut ; le popup reviendra.
            const project = pickerProject;
            setPickerProject(null);
            void openConversationFor(project);
          }}
          onManageTeams={() => {
            setPickerProject(null);
            grid.setActiveView("settings");
          }}
        />
      )}
    </main>
  );
}

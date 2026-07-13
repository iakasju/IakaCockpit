/**
 * demoAnalytics — modèle Analytics COMPLET de DÉMO (L30-P1). Vitrine dev-gardée : montre
 * la richesse des 4 perspectives (coût $, attribution par agent, comparaison de config)
 * que la donnée réelle ne couvre pas encore (P2/P3). Substitué UNIQUEMENT en démo dev
 * (`demoWidgetsOn` + aucune donnée réelle) ; JAMAIS en prod (garde « zéro fausse donnée »).
 *
 * Ancré sur `now` (factory, pas de date figée — calque `demoTasks`) : la série jour est une
 * fenêtre de 7 jours finissant « aujourd'hui », lisible quelle que soit la date d'exécution.
 * Les chiffres transposent les mocks validés `specs/design/redesign/A/analytics/v1..v4.html`.
 */
import type {
  AnalyticsModel,
  PerimeterEntry,
  DailyBucket,
  AgentDatum,
  TopDelegation,
  CompareModel,
} from "../hooks/useAnalytics";
import { ALL_SCOPE } from "../hooks/useAnalytics";

/** `Date` → `YYYY-MM-DD` local. */
function ymd(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const DEMO_PROJECTS: { id: string; tokens: number }[] = [
  { id: "iakacockpit", tokens: 1_420_000 },
  { id: "iakagraph", tokens: 984_000 },
  { id: "iaka-demo", tokens: 612_000 },
  { id: "iakaframe", tokens: 431_000 },
  { id: "iakabox", tokens: 218_000 },
  { id: "portefeuille", tokens: 112_000 },
  { id: "iakasuite", tokens: 93_000 },
];

const DEMO_AGENTS: AgentDatum[] = [
  {
    name: "Aragorn",
    role: "Coordinateur",
    runner: "claude / sonnet",
    color: "#3b82f6",
    tokens: 1_180_000,
    cost: 3.66,
    share: 0.31,
    turns: 61,
    avgDuration: "42 s",
  },
  {
    name: "Gimli",
    role: "Exécution",
    runner: "codex / gpt-5",
    color: "#30a46c",
    tokens: 942_000,
    cost: 2.36,
    share: 0.24,
    turns: 45,
    avgDuration: "51 s",
  },
  {
    name: "Gandalf",
    role: "Analyse",
    runner: "claude / sonnet",
    color: "#8e4ec6",
    tokens: 610_000,
    cost: 2.14,
    share: 0.16,
    turns: 30,
    avgDuration: "38 s",
  },
  {
    name: "Loki",
    role: "Design",
    runner: "claude / opus",
    color: "#f5a623",
    tokens: 458_000,
    cost: 2.29,
    share: 0.12,
    turns: 22,
    avgDuration: "63 s",
  },
  {
    name: "Odin",
    role: "Portefeuille",
    runner: "claude / sonnet",
    color: "#64748b",
    tokens: 312_000,
    cost: 0.97,
    share: 0.08,
    turns: 15,
    avgDuration: "33 s",
  },
  {
    name: "Frodo",
    role: "Livraison",
    runner: "claude / haiku",
    color: "#12a594",
    tokens: 210_000,
    cost: 0.21,
    share: 0.05,
    turns: 12,
    avgDuration: "22 s",
  },
  {
    name: "Legolas",
    role: "Qualité",
    runner: "ollama / llama3.1",
    color: "#b8770a",
    tokens: 158_000,
    cost: 0, // local · gratuit
    share: 0.04,
    turns: 8,
    avgDuration: "29 s",
  },
];

const DEMO_TOP_DELEGATIONS: TopDelegation[] = [
  { from: "Aragorn", to: "Gimli", project: "iakacockpit · refacto", tokens: 312_000, cost: 1.04 },
  { from: "Aragorn", to: "Gandalf", project: "iakagraph · audit", tokens: 214_000, cost: 0.71 },
  { from: "Aragorn", to: "Loki", project: "iakagraph · chartes", tokens: 198_000, cost: 0.68 },
  { from: "Gimli", to: "Legolas", project: "iaka-demo · gate", tokens: 126_000, cost: 0.42 },
  { from: "Aragorn", to: "Frodo", project: "iakaframe · livraison", tokens: 92_000, cost: 0.31 },
];

const DEMO_COMPARE: CompareModel = {
  aLabel: "30 juin → 6 juil.",
  bLabel: "6 juil. → 13 juil.",
  aSummary: "3,21 M tokens · $12,80 · claude-code / sonnet partout",
  bSummary: "3,87 M tokens · $11,64 · +2 agents, Gimli→codex, Frodo→haiku",
  aAgents: [
    { name: "Aragorn", runner: "claude / sonnet" },
    { name: "Gandalf", runner: "claude / sonnet" },
    { name: "Gimli", runner: "claude / sonnet" },
    { name: "Legolas", runner: "claude / sonnet" },
    { name: "Frodo", runner: "claude / sonnet" },
  ],
  bAgents: [
    { name: "Aragorn", runner: "claude / sonnet" },
    { name: "Gandalf", runner: "claude / sonnet" },
    { name: "Gimli", runner: "codex / gpt-5", flag: "chg" },
    { name: "Legolas", runner: "ollama / llama3.1", flag: "chg" },
    { name: "Frodo", runner: "claude / haiku", flag: "chg" },
    { name: "Loki", runner: "claude / opus", flag: "new" },
    { name: "Odin", runner: "claude / sonnet", flag: "new" },
  ],
  deltas: [
    { label: "Tokens", a: "3,21 M", b: "3,87 M", chip: "↑ 20 %", tone: "neu" },
    { label: "Coût", a: "$12,80", b: "$11,64", chip: "↓ 9 %", tone: "pos" },
    { label: "Coût / M tokens", a: "$3,99", b: "$3,01", chip: "↓ 25 %", tone: "pos" },
    { label: "Délégations", a: "148", b: "186", chip: "↑ 26 %", tone: "neu" },
    { label: "Temps agent", a: "13 h 15", b: "14 h 20", chip: "↑ 8 %", tone: "neu" },
  ],
  perAgent: [
    { name: "Aragorn", color: "#3b82f6", aTokens: 1_080_000, bTokens: 1_180_000 },
    { name: "Gimli", color: "#30a46c", aTokens: 1_020_000, bTokens: 942_000 },
    { name: "Gandalf", color: "#8e4ec6", aTokens: 640_000, bTokens: 610_000 },
    { name: "Frodo", color: "#12a594", aTokens: 260_000, bTokens: 210_000, note: "haiku" },
    { name: "Loki", color: "#f5a623", aTokens: null, bTokens: 458_000, note: "nouveau" },
    { name: "Odin", color: "#64748b", aTokens: null, bTokens: 312_000, note: "nouveau" },
  ],
  verdict: {
    title: "Config B plus efficiente malgré plus de volume",
    body:
      "+20 % de tokens mais −25 % de coût par million : basculer Gimli sur Codex et Frodo sur " +
      "Haiku a fait chuter le coût unitaire ; les 2 agents ajoutés élargissent la couverture " +
      "sans dériver le budget.",
  },
  hypothesis: {
    model: "haiku",
    baseCost: 11.64,
    altCost: 4.2,
  },
};

/** Modèle Analytics de démo, ancré sur `now`. Full (aucun `null`) → vitrine des 4 perspectives. */
export function makeDemoAnalytics(now: number): AnalyticsModel {
  const allTokens = DEMO_PROJECTS.reduce((s, p) => s + p.tokens, 0);
  const topTokens = DEMO_PROJECTS[0]?.tokens || 1;

  const perimeter: PerimeterEntry[] = [
    { id: ALL_SCOPE, label: "ALL · portefeuille", tokens: allTokens, barPct: 100, isAll: true },
    ...DEMO_PROJECTS.map((p) => ({
      id: p.id,
      label: p.id,
      tokens: p.tokens,
      barPct: Math.round((p.tokens / topTokens) * 100),
      isAll: false,
    })),
  ];

  // Série jour : 7 buckets finissant aujourd'hui (ancrés sur `now`).
  const day = 86_400_000;
  const inOut: [number, number][] = [
    [700_000, 200_000],
    [520_000, 160_000],
    [960_000, 280_000], // pic
    [460_000, 140_000],
    [620_000, 180_000],
    [300_000, 90_000],
    [260_000, 80_000],
  ];
  const daily: DailyBucket[] = inOut.map(([input, output], i) => {
    const d = new Date(now - (inOut.length - 1 - i) * day);
    return { date: ymd(d), tokens: input + output, input, output };
  });

  return {
    perimeter,
    scopeId: ALL_SCOPE,
    scopeLabel: "ALL · portefeuille",
    tokens: allTokens,
    coordVsSub: { coord: 1_180_000, sub: allTokens - 1_180_000 },
    daily,
    cost: 11.64,
    agentTime: "14 h 20",
    delegations: 186,
    perAgent: DEMO_AGENTS,
    costTrend: [1.2, 1.15, 2.73, 1.05, 1.6, 0.75, 0.6],
    topDelegations: DEMO_TOP_DELEGATIONS,
    variation: {
      title: "Variation détectée — jour le plus cher",
      body:
        "910 k tokens · $2,73 en une journée, soit +68 % vs la médiane. Cause probable : " +
        "refonte des chartes iakagraph (Gimli + Loki en parallèle, pic de contexte).",
    },
    cumulativeCost: [1.2, 2.35, 3.1, 5.8, 7.4, 9.9, 11.64],
    agentHours: daily.map((d, i) => ({
      date: d.date,
      hours: [2.4, 1.8, 3.27, 1.6, 2.2, 1.07, 0.93][i],
    })),
    compare: DEMO_COMPARE,
    hasRealData: true,
  };
}

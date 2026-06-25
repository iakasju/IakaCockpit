# Passerelle n8n — canal « adresse » sortant (L6)

Le Cockpit POSTe **UN** payload canal-agnostique vers **un webhook n8n** ; **n8n route**
vers le support actif (Slack / Discord / MQTT). Le Cockpit ne contient **aucun secret de
support** : ils restent dans n8n.

```
Cockpit  ──POST {n8n_webhook_url}──▶  n8n Webhook (X-API-Key)
         {canal:"adresse", support,        │  ack 200 (Respond Immediately)
          cible, message, meta}            ▼
                                     Switch sur `support` ──▶ Slack / Discord / MQTT
```

## Banc de recette

n8n local est déjà UP via la stack du projet : `http://localhost:5678`
(conteneur `iakacockpit-dev-n8n`, cf. `docker/docker-compose.yml`). Au **premier
lancement**, n8n demande de **créer le compte propriétaire** (acte manuel, en UI).

## Importer le workflow de référence

1. Ouvrir `http://localhost:5678`, créer le compte propriétaire si demandé.
2. **Workflows → ⋯ → Import from File** → choisir
   `docker/n8n/canal-adresse.workflow.json`.
3. Le workflow importé contient : un **Webhook** (Header Auth `X-API-Key`,
   *Respond Immediately*), un **Switch** sur `body.support`, et trois nœuds de support
   **placeholders désactivés** (Slack / Discord / MQTT).

> L'export JSON **n'inclut volontairement aucun credential** (séparés par n8n pour
> raison de sécurité). Aucun secret de support n'est donc versionné dans ce repo.

## Compléter les credentials (en UI, recette)

Tout ce qui suit est un **acte de configuration**, pas du code Cockpit :

1. **Header Auth (webhook)** : sur le nœud *Webhook (X-API-Key)*, créer un credential
   **Header Auth** → `Name = X-API-Key`, `Value = <un token de ton choix>`. Saisir le
   **même token** côté Cockpit : *Réglages → Canal adresse externe → Token du webhook*.
   (Si tu laisses le webhook sans auth, retire l'auth du nœud et ne saisis pas de token
   côté Cockpit : l'en-tête est alors omis.)
2. **Support(s)** : pour chaque branche du Switch utilisée, **activer** le nœud
   (placeholder désactivé par défaut) et y créer le credential correspondant :
   - **Slack** : credential Slack (token bot/OAuth) + canal (ou map `body.cible`).
   - **Discord** : credential Discord (webhook ou bot) + salon (ou map `body.cible`).
   - **MQTT** : credential MQTT (broker iakabox) ; topic par défaut = `body.cible`.
3. **Activer** le workflow (toggle *Active*) : la **production URL** devient
   `http://localhost:5678/webhook/iakacockpit-adresse`.

## Brancher le Cockpit

Dans *Réglages → Canal adresse externe (n8n)* :

- **URL du webhook** = la **production URL** ci-dessus (Active). Vide → mode **mock**
  (aucun POST réel).
- **Support actif** = Slack / Discord / MQTT (passé dans le payload, n8n route dessus).
- **Token du webhook** (facultatif) = le token Header Auth si le webhook est protégé.
- **Tester l'envoi** = POSTe un message ; affiche l'ack (`provider:n8n`, HTTP 2xx) ou
  l'erreur lisible (n8n injoignable / refus).

## Contrat du payload (rappel)

```json
{
  "canal": "adresse",
  "support": "slack",
  "cible": "#iakaframe",
  "message": "…",
  "meta": { "royaume": "IAKACOCKPIT", "agent": "…", "project": "…", "ts": "…", "source": "iakacockpit" }
}
```

- `canal` est toujours `"adresse"` en phase 1 (geste/pensée réutiliseront la même
  passerelle plus tard, sans rouvrir le contrat).
- `cible` est **optionnelle** et **opaque** (le Cockpit ne connaît pas la topologie des
  supports).
- L'ack 2xx = **« n8n a reçu et va router »**, PAS « arrivé sur le support » (diffusion
  asynchrone côté n8n).

## Différé (hors L6)

Bidirectionnel (entrant Slack/Discord/MQTT → Cockpit), câblage automatique des
sollicitations d'agents, canaux geste/pensée réellement émis. Non couverts ici.

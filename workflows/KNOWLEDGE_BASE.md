# Set up the Paxon help Knowledge Base

Knowledge Bases are organization-level and created in the **Context** app in the Sanity Dashboard (organization `objVdfY4N`). It takes about five minutes. Run `npm run seed` first so the FAQs exist.

## 1. Create the Knowledge Base

Context app → **Knowledge Bases** → **New**.

- **Title:** Paxon help
- **Purpose** (this steers how the outline is organized):

  > Customer-facing help for Paxon (demo) webshops and contact-centre agents. Covers fulfillment, returns, transportation, regulated logistics, onboarding and API access, in English, Dutch, French and German.

## 2. Add the sources

**Dataset source:** project `jitb27qd`, dataset `production`, with this GROQ query:

```groq
*[_type == "faq" && !(_id in path("drafts.**"))]{_id, question, answer, topic, language}
```

**File source:** upload [`seed/legacy-brand-page.md`](seed/legacy-brand-page.md).

This is a fictional 2023 brand page that still promises a **45-day** return window, while the FAQ says **30 days**. Leave it in on purpose: the build reports it as a conflict, and that conflict is how the demo question "Can I return after 40 days?" gets classified as **outdated**.

Click **Build** and wait until the status is ready. Have a look at the **Issues** tab: the 30-day versus 45-day conflict should be listed there, which is worth showing on camera.

## 3. Create the MCP endpoint

Context app → **MCP endpoints** → **New**.

- **Title:** Paxon help
- **Name:** `paxon-help` (this can't be changed later; the code expects this name)
- **Sources:** only the _Paxon help_ Knowledge Base, so the endpoint serves Knowledge Base mode.
- **Instructions** (optional): "Answer only from Paxon help content. Say when the content conflicts."

The endpoint URL is already in `workflows/.env`:

```
https://api.sanity.io/v1/context/organizations/objVdfY4N/mcp/paxon-help
```

## 4. Create the organization token

A project token does **not** work here; it fails with `403 contextGrantRequired`.

[Manage](https://www.sanity.io/manage/org/objVdfY4N/api/tokens) → organization → **API** → **Tokens** → **Add token**, with role **Context Editor** (Viewer is enough for the Knowledge Base, but the help chat also saves conversations to Insights).

Paste it into `workflows/.env`, which is git-ignored and never shown in the app:

```
SANITY_CONTEXT_TOKEN="sk…"
```

The help chat uses the same token for the Knowledge Base and for saving conversations to Insights. Put it in `frontend/.env.local` as `SANITY_ORGANIZATION_TOKEN` too. Saving and classifying conversations need **Context Editor** or higher, so give this token the Context Editor role (it can still read the Knowledge Base).

## 5. Test it

```sh
npm run kb:ask -- "Can I return a parcel after 40 days?"
```

Expect `Verdict: outdated` with citations to the returns FAQ and the legacy page. Also try:

- "Do supplements have to be stored below 25°C?" should come back **answered**.
- "What are your Black Friday cut-off times?" should come back **missing**.

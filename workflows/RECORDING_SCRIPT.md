# Recording script – Paxon Question Desk

Story: **every customer question makes the help content better.** About 6 minutes.

## Before you hit record

1. `npm run reset` – clears all workflow instances and demo documents, restores the seed.
2. `npm run dev` – frontend on 3000, Studio on 3333, Question Desk on 3334, and the drainer (runs the automatic steps, about 10 seconds each). Stop any other dev servers or drainers first.
3. Want to control the pace? Use `npm run apps` (same, without the drainer) and run `npm run drain -- --step` in a second terminal (press Enter to advance each automatic step).
4. Open the Question Desk from the Sanity dashboard (`sanity.io/@objVdfY4N` → Question Desk, or the URL printed by `npm run dev:desk`).
5. Log in as the FR/DE reviewer (set under **Reviewers** on the French and German locale documents in the Studio), so "For me" fills up.
6. Close the terminal that has `.env` open. Nothing with a token should be on screen.

## 0. A customer asks the help chat (1 min) – optional, needs the Insights keys

- Open `localhost:3000/help`, pick **France · Français**, ask: "Quelles sont vos heures limites de commande pendant le Black Friday ?"
- The chat checks the Knowledge Base and says honestly that it doesn't have this, and offers the contact centre.
- "Every conversation is saved to Insights. Insights scores it and spots what content was missing."
- Run `npm run insights`: score, sentiment and the content gap print, and **a new question lands in the Question Desk inbox**, with a "From Insights" card.
- Optional: show the Context app → Insights in the dashboard (success score, sentiment, content gaps).

## 1. The inbox (30s)

- Show the **Inbox**: six seeded questions (plus the one from the chat) from the chatbot and contact centre, in EN, FR, DE and NL, all status **New**.
- "These come in every day. Usually they're answered and forgotten. Here, each one is a signal about our help content."

## 2. A question that's already answered (45s) – optional

- Open **question 1** (vitamin supplements below 25°C) → **Check**.
- Step the drainer: signals → Knowledge Base.
- Verdict **Answered**, with a citation to the regulated-products FAQ. Nothing to do. "The Knowledge Base proves our content already covers it."

## 3. A question that exposes outdated content (2 min) – the main beat

- Open **question 2**: "One of your pages says 45 days to return, the help centre says 30."
- **Check**. Step the drainer:
  - **Signals**: topic returns, market NL, intent, urgency.
  - **Knowledge Base**: verdict **Outdated**. Point at the two citations: the returns FAQ (30 days) and the 2023 legacy brand page (45 days). "It found the conflict, and it shows its sources."
  - **FAQ change**: before/after. The answer keeps the facts and adds a sentence that settles it.
- Status moves to **In review** and three language cards appear: NL, FR, DE.
- Step the drainer through the translations:
  - **NL**: translated, brand check ✓, consistency check ✓, auto-approved (Dutch guideline doesn't require a human).
  - **FR**: brand check ⚑ flagged for the informal "tu" register. It fixes itself and passes on the second check. "The brand guideline lives in the Studio. The editor owns the rules, the AI follows them."
  - **DE**: passes, waits for the German reviewer.

## 4. "For me" – the reviewer (1 min)

- Switch to **For me**. FR and DE are waiting, English next to the translation, with the check results.
- **Approve** DE.
- On FR, click **Send back with a note** ("Say 'retour' not 'renvoi'"), step the drainer: it fixes with the note, re-checks, comes back. **Approve**.
- Step the drainer: **publish** – English FAQ and all three translations are published together. Question 2 shows **Published**.

## 5. A missing answer (45s) – optional

- **Question 3** (Black Friday cut-off times) → **Check** → verdict **Missing** → a brand-new FAQ is drafted and goes through the same translation flow.

## 6. The Studio (45s)

- Open the Studio → **Paxon (demo) → Brand guidelines → French**. Show formality, tone of voice, terms to use/avoid and "Always needs a human reviewer".
- Open the returns FAQ (**FAQs → All FAQs**): the workflow panel shows the run history.
- Optional: in the Knowledge Base, show the conflict between the FAQ and the legacy brand page – the content team can now retire the legacy page.

Close: "Every question made the help content better – in four languages, on brand, with a human where it matters."

## If something goes wrong

- A step fails: the drainer prints the reason and a `npx sanity-workflows set-stage …` command that re-runs it.
- Start over at any time: `npm run reset`.
- The Question Desk Check button does the same as `npm run ask -- 2`.

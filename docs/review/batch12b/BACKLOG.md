# Batch 12B — backlog

- Desktop home: only the "पहली बार?" banner and the WhatsApp card were moved into the centered column. The search / near-you sections and the open-to-all strip were left as they were (the open strip is intentionally full width).
- Hero left column leaves some white space under the hero buttons on wide screens (the right column of three tiles is taller than the left). Not touched.
- `src/lib/festivals.js` can hold future festivals: add one entry with India dates; the card text is per festival, so a new festival also needs its own strings/picture (the component currently shows the Dussehra text only).
- The date is read once when the page mounts; a visitor who keeps the tab open across midnight India time sees the card disappear only on the next load.

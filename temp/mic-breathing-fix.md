# Mic breathing fix — to-do

Mic: FIFINE AmpliGame AM8 (USB). Problem: the mic records breathing and mouth sounds when I am not talking.

Delete this file after the setup is done and tested.

---

## Step 1 — Mic position (free, do first)

- [ ] Keep my mouth **4 to 6 inches** from the mic (about one hand wide).
- [ ] Talk into the **top end** of the mic (the black foam part), not the front with the knobs.
- [ ] Tilt the mic **a little to the side**. The top should point at the corner of my mouth, not straight at it.
- [ ] Foam cover: already on the AM8 (the black top). Nothing to buy.
- [ ] Gain knob = the knob with the **mic icon** (the upper one, check the small icon). Turn it **down a little** (about 1/8 turn) and sit a little closer. The other knob is headphone volume. The top button is mute.

## Step 2 — Find my voice level

- [ ] Open OBS. Talk normally for 10 seconds.
- [ ] Look at the mic meter. Write down where my voice peaks: ______ dB

## Step 3 — Add the Noise Gate in OBS

- [ ] Right-click the mic source → **Filters** → **+** → **Noise Gate**.
- [ ] Filter order (top to bottom): **RNNoise → Noise Gate → Limiter**.
- [ ] Set the numbers:

| Setting | Start value |
|---|---|
| Open threshold | 7–10 dB below my voice peak (if voice peaks at -18 dB → **-25 dB**) |
| Close threshold | 10 dB below Open (example: **-35 dB**) |
| Attack | 25 ms |
| Hold | 250 ms |
| Release | 150 ms |

## Step 4 — Test (5 minutes)

- [ ] Record 40 seconds: talk 10 s → breathe 10 s → silent 10 s → talk 10 s.
- [ ] Listen with headphones.
- [ ] Still hear breaths? → raise **both** thresholds by 3 dB. Test again.
- [ ] Start or end of words cut? → lower **both** thresholds by 3 dB. Test again.
- [ ] Voice sounds choppy? → remove the Noise Gate and try the **Expander** filter instead.

Final numbers: Open ______ dB · Close ______ dB

## Step 5 — Mouth clicks

- [ ] Drink water before recording. Keep a glass near me.
- [ ] When not talking: breathe through my nose and turn my head a little away from the mic.

## Step 6 — Done

- [ ] Tell Claude the final numbers → save them in `playbook/voice-presets.md`.
- [ ] Delete this file.

---

## Old videos (already recorded)

DaVinci Resolve → **Fairlight** → **Mixer** → double-click **Dynamics** on the Voice track (A1) → turn on **Expander/Gate** → Gate mode, threshold about **-40 dB**.

## Remember

A small breath now and then sounds natural. Do not set the gate too strong. The goal is to remove the loud breaths in quiet parts, not every sound.

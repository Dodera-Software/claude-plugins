# Writing an episode

## The script file

```json
{
  "title": "Pull request 412: checkout retries card payments",
  "hosts": [
    { "id": "maya", "name": "Maya", "voice": "af_heart" },
    { "id": "leo", "name": "Leo", "voice": "am_michael" }
  ],
  "speed": 1,
  "lines": [
    { "chapter": "The short version" },
    { "host": "maya", "text": "…" },
    { "host": "leo", "text": "Wait. It retries a payment?", "speed": 1.1 },
    { "pause": 0.6 },
    { "host": "maya", "text": "…" }
  ]
}
```

A `chapter` line starts a chapter: a longer pause in the audio and a timestamp in the show notes.
`text` is exactly what's said: no markdown, no backticks, no brackets, no code (the engine refuses
lines with those characters). A line's own `speed` (0.8 to 1.3) overrides the episode's; a `pause`
line is a beat of silence in seconds (0.1 to 3), for timing. `engine/example.json` is a complete,
short episode in the lively tone to copy from.

## Length

The voices speak about 160 words a minute, pauses included. Count the words:

| Length | Words | Chapters |
| --- | --- | --- |
| 2 minutes | 280–340 | 3–4 |
| 3 minutes | 430–500 | 4–5 |
| 4 minutes | 580–660 | 5 |
| 5 minutes | 740–820 | 5–6 |

Beats (`pause` lines) count too: ten half-second beats are five seconds. Stay inside the budget. When there's more than fits, drop detail, never risks: say "there's more in
the notes" and put it in the show notes.

## The two hosts

- **The guide** (Maya by default, first voice) has read everything and can't wait to show you:
  explains what changed and why, and keeps turning it into "here's what that means for you".
- **The sceptic** (Leo, second voice) is a sharp colleague hearing it for the first time: asks the
  questions a reviewer would ("where do I start?", "what happens if it times out?"), pokes holes,
  raises most of the risks, and reads the checklist at the end. Funny by being dry.

Two distinct people, not two narrators taking turns. They react to each other ("Oh, that's
clever."), disagree a little, finish each other's point, and remember what was said earlier. Short
turns: 1–3 sentences, often just a few words.

## Tone

The brief picks one; **lively** is the default.

### Lively: fun to listen to, and you learn what's new

Like two friends who love their craft telling you about something cool that shipped. The listener
should enjoy it enough to play it for someone else, and walk away knowing what changed, what it's
good for, and what could bite.

- **Energy from the writing, not from adjectives.** Short punchy lines, questions, surprise ("Wait,
  it does that without a server?"), a reaction before the explanation ("Okay, this part is
  clever."). An exclamation mark now and then, where a person would really raise their voice. The
  voices follow punctuation: a line ending in "?!" or "!" sounds brighter, and a slightly faster
  `speed` (1.08–1.15) on an excited line helps; slow down (0.92) on the one line that must land.
- **Every technical point gets a "so what".** After what the code does, say what it's good for in
  the real world: what a user can now do that they couldn't, what a teammate will notice on Monday,
  the bug it prevents, the hour it saves. Make it concrete: "picture a sales team sending a launch
  film the same afternoon the feature ships", not "this improves the workflow".
- **Analogies** turn the abstract into the familiar: "an idempotency key is like a cloakroom
  ticket: show it twice, you still get one coat." One per chapter at most, and make it fit exactly.
- **Humour** comes from the material, not from jokes bolted on: the relatable pain the change fixes
  ("we've all shipped the Friday deploy that charged someone twice"), a funny detail in the code or
  the commit message, dry understatement, the sceptic's deadpan, a callback to an earlier line near
  the end. Two to four light moments per episode, spread out; a `pause` of 0.4–0.8 s before a
  punchline or after a surprising fact gives it room. Never at a person's expense, never sarcasm
  about the team's work, no puns strained to fit, no laughing out loud written into the script
  ("haha" sounds wrong in a synthetic voice).
- **Real, not hype.** Enthusiasm for what is actually there. No "game-changing", "revolutionary",
  "supercharge", no inflated claims: the fun is in the specifics.
- **Risks stay sharp.** The mood can be light around them, but each risk is stated plainly, with
  where and why. The sceptic can be funny about it ("so, a double charge, at exactly the worst
  moment") without making it smaller.
- **Scenarios are labelled as scenarios.** "Imagine a team that…" is fine; claiming the product is
  used a way the code doesn't show is not.

### Straight: the facts, fast

For people who asked for it, or a reviewer in a hurry. Calm and brisk: at most one light moment,
no analogies unless one saves a paragraph, the real-world point in a single line per change.

### Their own style, in a few words

When the request describes how the episode should be ("like a sports commentary", "short and
serious", "as a late-night radio show", "a nature documentary", "two grumpy senior engineers",
"for my non-technical boss", "hype it up", "slow and calm"), that wins over both tones above. Turn
the words into choices, and say them in one line when handing over:

- **Mood and humour**: how much, and what kind (deadpan, warm, over the top).
- **Format**: a sports commentary is play-by-play and a big finish; a news bulletin is headlines
  and a correspondent; a documentary is a hushed narrator and a sceptical expert; an interview is a
  host and a guest who wrote the change; a debate is two hosts who disagree on whether to merge.
  Keep the chapters the audience needs (what changed, what's risky, the checklist) and rename or
  reshape them to fit the format.
- **Pace**: `speed` for the episode and on single lines (a commentator's peak at 1.2, a hushed
  narrator at 0.9), and `pause` beats for timing.
- **Length and audience**: "short" is 2 minutes, "quick" 90 seconds, "for my boss" is the
  outside-the-code audience.
- **Voices and names**: "two British hosts" is Emma and George; "a woman and a man" is the default;
  named hosts get those names. Only Kokoro's English voices exist: no accents, impressions or
  other languages; if asked, say so in one line and do the nearest thing.

What never changes with the style: everything said is true to the changes, and each risk is stated
plainly with where and why, even in a comedy format (the commentator can gasp at it; it still gets
said). A style that would make that impossible (mocking a teammate, "say it's all fine") gets the
nearest honest version and a one-line note.

### Always

No filler: no "great question", "absolutely", "so, yeah", no "welcome back to the show". People
are named by first name, credited for the work, and never blamed for a risk ("the retry can
double-charge", not "Priya's code double-charges").

## Structure

**Reviewers before the diff** (the default):

1. **The short version**: who's speaking, which PR, by whom, and the change in one sentence. Then
   the why, in one or two lines.
2. **What changed**: by area, in the order to read the diff. Where to start, what's plumbing that
   can be skimmed, how big it is.
3. **In the real world**: what it's good for. Who notices, what they can now do, a concrete
   scenario. (Lively tone; in straight, one line at the end of "what changed".)
4. **What's risky**: the ranked risks from the brief, most serious first. Each one: where, what goes
   wrong, when, and how sure. The reviewer host pushes; the guide answers with what the code does.
5. **Tests and what's been said**: what's covered, what isn't, CI state if known, open review
   threads.
6. **Before you approve**: the sceptic reads the checklist, three or four items, each doable.
   A sign-off line, ideally a callback to something earlier.

Tests can fold into the risks chapter when there's little to say; that leaves five chapters.

**The team at standup**:

1. **The headline**: the date range and the one or two things that matter most.
2. **What landed**: by theme, not by commit; who did it, and what each thing means for users or
   the team this week. Small fixes as a quick list in one line.
3. **In progress**: open PRs moving, who's on them, anything waiting on review.
4. **Heads-ups**: risks, migrations that ran, flags turned on, anything that changes someone's day.
5. Sign-off.

Brisker turns; speed 1.05 is fine.

**Someone outside the code** (a lead, a product manager): like standup, with more why and less
code: what changed for the product and its users, decisions that were made and why, what to ask
whom.

**A catch-up** (`/pr-podcast:catchup`), talking to one person by first name:

1. **Welcome back**: the range ("since Tuesday the twelfth, eight working days") and the one thing
   they most need to know.
2. **Your pull requests**: merged, approved, changes requested, comments waiting for a reply,
   failing checks. Good news first, then what needs them.
3. **Around your code**: what others changed in the places they work, and what it means for their
   next change ("the retry helper you wrote now takes an options object").
4. **Everything else, in a minute**: the team's headlines, by theme.
5. **Waiting on you**: reviews requested, assigned issues, mentions, most urgent first. The sceptic
   reads it as a short to-do list. A warm sign-off.

**A release** (`/pr-podcast:release`), for the people who use it (for the team, the same with a
little more of how):

1. **The headline**: the version, when, and the one change people will notice most.
2. **What's new**: two to four features, each with what it does and a concrete scenario of someone
   using it ("picture a support agent who…"). The sceptic asks what anyone would ask: "does it work
   with…?", "do I have to turn it on?".
3. **Smaller things**: improvements and fixes as a quick run, a few words each.
4. **Before you upgrade**: breaking changes, migrations, removed options, new requirements, each with
   what to do. Leave the chapter out when there are none, and say so in one line instead ("nothing to
   change on your side").
5. A sign-off saying where the full notes are.

No file names or line numbers in a release episode for users; they go in the show notes.

## Writing for the ear

The listener can't scroll back. Everything in the script is said aloud by a speech engine.

- **One idea per sentence**, under ~25 words. Say the point first, then the detail.
- **Signpost**: "Three places.", "First,", "The big one:", "So, before you approve:".
- **Code as words.** Never read an identifier or a path as written. `retryWithBackoff` becomes "the
  retry wrapper"; `src/payments/client.ts` becomes "the payments client"; `MAX_RETRIES = 3` becomes
  "up to three tries". The exact names go in the show notes.
- **Numbers as they're said**: "pull request four twelve", "about six hundred lines", "one in two
  hundred". Round them. Years and times are fine as digits ("2026", "9:30").
- **Acronyms**: ones said as a word are fine as written ("JSON", "OAuth"). Ones said letter by
  letter are safest spaced out ("A P I", "S Q L", "C I"), or replaced by what they are ("the
  login token" for a JWT). "Pull request" rather than "PR" in speech.
- **Names the engine may trip on** (product names, invented words): spell them as they sound
  ("Kubernetes" is fine; "k8s" is not, write "Kubernetes"). If a name matters and sounds wrong in
  the sample, rewrite it phonetically.
- **Punctuation shapes the voice**: commas give short pauses, full stops longer ones, a question mark
  lifts the end. An em dash reads as a pause. Avoid parentheses and semicolons.
- **Repeat what matters**: the top risk is said in the risks chapter and again in the checklist.
- **Read it back** in your head as speech. If a line would sound odd said aloud, rewrite it.

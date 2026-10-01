---
name: voiceover
description: Add a narrator's voice to a product video, or make a new video with one, recorded on the computer with free, open voices (English). Use when someone asks for a voiceover, narration, a voice, or "someone talking over" a video.
argument-hint: "[optional: which video, the tone of voice, or what the new video is about]"
---

# Add a voiceover

The request: $ARGUMENTS

A narrator reads a line per scene, recorded on this computer with Kokoro's free voices (English:
American and British). Follow the `make` skill for everything not said here:
`${CLAUDE_PLUGIN_ROOT}/skills/make/SKILL.md` (who you're working with, getting ready, checking,
handing over) and `references/voice.md` for writing, choosing and recording the voice.

1. **Which video.** If the project has a `video/` folder with videos in it (`./render.sh` lists
   them), ask with the multiple-choice tool which one gets a voice, plus "A new video". No videos
   yet, or they chose a new one: make it with the `make` skill, with "Narrator voice" as the sound
   (don't ask the sound question again), and come back to step 4 when the storyboard is approved.
2. **Language.** The voices speak English. If the video is in another language, say so in one
   plain sentence and offer: an English voice over the video, an English version of the video
   with a voice, or keeping it without a voice. Don't record another language with an English
   voice.
3. **The lines.** Read the video's scenes and words (`src/videos/<slug>/`), then write one spoken
   line per scene (references/voice.md, "Writing the narration"). Show them the way the
   storyboard shows scenes: a line per scene with the words the voice says, and wait for a yes or
   changes.
4. **The voice.** Record the first line in two or three voices that suit the video
   (`./render.sh voice-sample "<line>" af_heart am_michael bf_emma`), open the samples for them,
   recommend one, and let them choose. The first time on a computer this installs the voice
   engine and downloads the voices: tell them in one line ("Setting up the voices, a one-time
   minute or two").
5. **Record and fit.** Write `src/videos/<slug>/voice.json` and run `./render.sh voice <slug>`.
   Import `public/voice/<slug>/voice.json` as the video's `voiceover` and give each scene its
   `voice` line; scenes grow to fit their line by themselves. If a line lands before its picture
   (the product named before the logo shows), move it with `{ line, at }`. `npm run typecheck`,
   then `npm run timeline`: no line may run into the next scene's entrance.
6. **Offer the editor, then make it.** First ask, as the make skill's step 7 does, whether to open
   the editor (where they can rewrite a line and hear it again on the spot) or make the video now.
   Then (`./render.sh <VideoId>`) open it, and ask them to listen: "Is the voice's pace
   right? Any line you'd like said differently?" A changed line is recorded again in seconds.

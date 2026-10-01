# Contributing

Thanks for wanting to help. Ideas, bug reports and videos or episodes you made are as welcome as
code.

- **An idea or a question:** start a [Discussion](https://github.com/Dodera-Software/claude-plugins/discussions).
- **Something broke:** [report it](https://github.com/Dodera-Software/claude-plugins/issues/new/choose).
- **A change you'd like to make:** for anything bigger than a small fix, open a Discussion or an
  issue first, so we can agree on the approach before you spend time on it.

## Making a change

1. Fork the repo and make a branch.
2. Try your change as a user would, in another folder, with this working copy loaded for one
   session: `claude --plugin-dir /path/to/claude-plugins/plugins/video-kit` (or `pr-podcast`).
3. Run the checks:
   ```bash
   claude plugin validate .
   claude plugin validate plugins/video-kit        # and/or plugins/pr-podcast
   cd plugins/video-kit/skills/make/template && npm install && npx tsc --noEmit
   ```
   For changes to the video kit, also look at stills of what you changed
   (`./render.sh AcmeTeaser-en still <frames>`) and render the example (`./render.sh AcmeTeaser-en`).
   For pr-podcast's recording engine, record the example episode
   (`node record.mjs example.json /tmp/ex.mp3` in `plugins/pr-podcast/skills/make/engine`).
4. Open a pull request. The checks run on it, and a maintainer reviews it.

Don't bump the plugin's version or write release notes: we do that when we release.

## What we keep true

- **Video Kit's users are often not technical** (sales, marketing, founders). Claude does every
  technical step itself and speaks in plain words: nothing a user has to type into a terminal,
  no jargon in what Claude says to them.
- **Nothing is about one product.** The example brand and video (`acme`) are made up.
- **Every video is invented for its product,** not assembled from the kit's scenes.
- **Nothing leaves the user's computer** that the README's "What leaves your computer" doesn't list.
- **No sound effects or music;** a video is silent or narrated, an episode is two voices.
- **The skills' reference files describe the kit's API.** Change them in the same pull request as
  the code, or Claude will use the kit wrong.

By contributing, you agree that your contribution is licensed under the [MIT License](LICENSE) and
that you'll follow our [Code of Conduct](CODE_OF_CONDUCT.md).

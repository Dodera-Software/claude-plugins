# The directed brief: an interview

The difference between a video people remember and generic AI output is almost always the
person's vision: the idea that the film ends with a hammer strike, that it should feel like a
Duolingo lesson, that it opens on the problem their customers complain about. Most people have
that vision but won't volunteer it. This interview draws it out, one topic at a time, and turns it
into the brief the storyboard is built from.

Run it like a good creative director, not a form:

- **One topic at a time**, with the multiple-choice tool where the answers can be offered (with
  "Other" always there), a plain question where they can't. Never more than four questions in a
  round.
- **Push back on vague answers.** "Make it cool", "modern", "professional" mean nothing yet: ask
  what they mean with two or three concrete options ("cool like Apple's calm product films, like a
  Stripe launch page in motion, or like a fast social edit?").
- **Offer ideas to react to.** People react better than they invent: for each open question,
  propose two or three concrete options from what you read in the product.
- **Keep it moving:** about ten minutes. If they say "you decide" on a topic, decide, note it, and
  move on.

## The topics, in order

1. **Why and for whom.** Who watches it (customers, prospects, investors, the team), where (site
   hero, LinkedIn, a sales email, a launch event), and what should they do or feel afterwards?
2. **The one message.** In one sentence, in their words: what should a viewer remember? Offer
   two or three candidates from the product's own copy.
3. **References.** "Is there a video, a product or an ad whose style you love? Especially: how it
   starts, and how it ends." A file or a link: watch it (`node scripts/reference.mjs <link or
   file>`, direction.md); if it can't be downloaded, ask for a short screen recording or
   screenshots. A name: describe back what you know of it and ask if that's the part they mean.
   None? Offer to find some (direction.md, "Finding inspiration"). Write down what exactly they like: the
   pace, a transition, the ending, the humour, the typography. Borrow the feel, never their
   content or brand.
4. **Must show, must avoid.** Features or moments that have to be in it; anything that must not
   (a competitor's name, customer data, an unfinished feature, a claim legal wouldn't like).
5. **Personality.** Offer pairs to choose between: calm or energetic, serious or playful, premium
   or friendly, understated or bold. Humour: none, a light touch, or a running joke?
6. **The direction.** Three directions that differ at a glance, with pictures (direction.md):
   which one, or what to take from each.
7. **The signature moment.** Propose two or three concrete, product-specific ideas (the
   Duolingo-style "skill unlocked" ending, the logo rising out of a hammer strike, ten tools
   snapping into one); ask which excites them, or what they'd do instead.
8. **Form.** Scene by scene or cinematic with 3D (the look comes from the direction they picked), how the
   product appears (recreated, real recordings, their own recordings) and in which frame (browser
   window, laptop, phone).
9. **Sound.** Silent, or a narrator (and what kind of voice: calm, warm, energetic).
10. **Practical.** Length, shapes (wide, square, tall), languages, and any date it's needed for.

## Then write it down

Write `video/src/videos/<slug>/VISION.md` in their words: the audience and goal, the one message,
the references and what exactly to take from each, the direction they picked, must-show and
must-avoid, the personality, the signature moment, the look, form, sound and practical choices. Show it to them as a short summary
("Here's what I heard…") and ask if it's right before the storyboard. The storyboard then follows
it, and every scene should trace back to something in it.

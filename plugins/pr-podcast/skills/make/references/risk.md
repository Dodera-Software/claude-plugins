# Finding what's risky

Go through the list against the diff. For each hit, open the code around it: a diff shows what
changed, not what calls it. Keep a risk only if you can say **where** (file and line), **what goes
wrong**, **when** (the input or situation), and **how sure** you are:

- **It will break**: you can trace the failure through the code.
- **Worth a look**: it depends on something the diff doesn't show (a caller, the data, the setup).

Rank by what it would cost: lost or wrong data and money first, then security, then outages, then
everything else. Two or three real risks beat a long list. If nothing stands out, the episode says
so and says what you checked.

## The checklist

**Data**
- Schema changes and migrations: are they reversible? Do they lock a big table? Is there a backfill,
  and does old code still work while it runs (deploys aren't instant)?
- Deleting, renaming or changing the type of a field that stored data, caches or other services
  still read.
- Defaults that change what existing rows mean.

**Money, counts and state**
- Retries, queues and webhooks: can the same thing happen twice? Is there an idempotency key, and is
  it stable across the retry?
- Races: two requests at once, read-then-write without a lock or transaction.
- Rounding, currencies, time zones, daylight saving, "end of month".

**Security and privacy**
- Permission checks added, moved or removed; new endpoints or routes without them.
- User input reaching queries, shell commands, file paths, HTML or redirects.
- Secrets, tokens or personal data in code, logs, errors or analytics.
- Dependencies added or bumped a major version.

**Behaviour for users and callers**
- Public API, event, file-format or config changes that other services, apps or old clients rely on.
- Errors now swallowed, or newly thrown where nothing catches them.
- Feature flags: what the default is, and what happens with the flag off.
- Performance: queries in loops, missing indexes for new queries, work moved into a request path,
  unbounded lists.

**Tests and delivery**
- Tests deleted, skipped or loosened (`skip`, `only`, snapshots updated wholesale, assertions
  removed).
- The important path untested: the failure case, the retry that succeeds, the empty list.
- CI red or not run; review comments still open; "TODO" or "hack" added in the diff.
- Rollout: environment variables or infrastructure the deploy needs, and whether it can be rolled
  back.

## What not to raise

- Style, naming and formatting: the linter's job, not an episode's.
- Risks you can't point to. "This might have performance issues" with no place and no reason is
  noise.
- What's already settled in the review threads (mention it as settled, if it matters).

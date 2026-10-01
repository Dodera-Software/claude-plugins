# Security

If you find a security problem in these plugins, please tell us privately, not in a public issue:

- **On GitHub:** [report a vulnerability](https://github.com/Dodera-Software/claude-plugins/security/advisories/new)
  (only you and the maintainers can see it), or
- **By email:** office@doderasoft.com

Tell us what you found and how to reproduce it. We'll answer within a few working days, and
credit you in the release that fixes it if you'd like.

## What the plugins do on your computer

Both plugins run on your own computer and send nothing to us: no accounts, no analytics, no
uploads. What each one downloads and keeps, and where, is in its README ("What leaves your
computer" in [video-kit](plugins/video-kit#what-leaves-your-computer)). The only login details
video-kit ever handles is an optional demo login for screenshots of your own app: it's read from
`VIDEO_*` environment variables while the screenshots are taken, used only on your computer, and
never written to a file.

Fixes ship as a new version; update from `/plugin` → Installed → Update now.

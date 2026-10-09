---
status: accepted
---

# Fork the reference site instead of re-creating its look

The new qiuyihong.com is built by forking the reference site (ncdai/chanhdai.com, MIT, pinned at `1951e21`) and stripping it down, not by re-creating its look in a fresh Next.js app. A fork carries every detail of the layout, styling and interactions as they are, where a re-creation would only approximate them. It also leaves the door open to pulling upstream improvements. Re-creation was recommended first and briefly chosen. It would have meant copying about 30 files into a fresh app instead of trimming a 664-file codebase, but it was reversed on 2026-10-09.

## Consequences

- **Identity has to be replaced before launch.** The fork starts out as *his* site, and `TRADEMARK.md` excludes his name, marks, likeness and "any presentation close enough to make a reader mistake your site for mine". Every identity file has to be swapped before anything goes live.
- **Out-of-scope features already exist in the code.** The registry, blog, analytics and the rest must be actively removed or disabled, not just left unbuilt. See [What does a fork of chanhdai.com have to delete or rewrite?](https://github.com/Qiuyi-Hong/personal-website/issues/16).
- **How the code enters this repo is a separate decision.** That covers merging his history versus copying a snapshot, and whether to follow upstream. See [How does this repo take in chanhdai.com, and do we follow upstream?](https://github.com/Qiuyi-Hong/personal-website/issues/15).

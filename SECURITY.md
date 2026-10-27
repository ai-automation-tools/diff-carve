# Security policy

## Reporting a vulnerability

Please don't open a public issue for a security problem. Report it privately through
GitHub's [private vulnerability reporting](https://github.com/ai-automation-tools/diff-carve/security/advisories/new)
on this repo. Include what you found, how to reproduce it, and the version or commit you
tested.

You'll get an acknowledgement within a week. Once a fix is out, the advisory is published
with credit to you unless you'd rather stay anonymous.

## Supported versions

DiffCarve is pre-1.0. Only the latest commit on `main` gets security fixes.

## What's in scope

DiffCarve runs on your machine or in your own CI, and sends nothing anywhere except the PR
comment the Action posts through `GITHUB_TOKEN`. Reports that matter most:

- anything that makes DiffCarve send code or diff content off the runner
- a way for a crafted pull request to run code in the Action or leak its token
- a way to make the Action approve, merge, or block something it shouldn't

# fc — full check

## When to use

Use as the **final step** before considering work complete. If anything fails, fix the issues and run this again until everything passes.

## Command (from this repo)

Run this from the package root (the directory containing this `package.json`).

```bash
npm run full-check
```

## Notes

- Do not treat the task as done until the command exits with status 0.
- If the change touches both `be` and `site-index`, run `npm run full-check` in each of those package roots before considering the work complete.

# REDLINE Development Guide

## Versioning System

The game version and latest changelog are now dynamically updated using a git pre-commit hook.

### How it works
1.  **Base Version**: The major.minor version is stored in the `VERSION` file (e.g., `0.5`).
2.  **Patch Number**: The patch number is automatically generated based on the total number of commits in the current branch (`git rev-list --count HEAD`).
3.  **Latest Message**: The "LATEST" message on the home screen is pulled from the most recent commit message.
4.  **Automatic Updates**: A git pre-commit hook runs `tools/update_version.py` which updates `js/version.js` before every commit.

### Setup
If you are setting up the repository for the first time, run the installation script to set up the git hooks:
```bash
bash tools/install_hooks.sh
```

### Manual Update
You can manually trigger a version update by running:
```bash
python3 tools/update_version.py
```

### Guidelines for Agents
-   **Always install the hooks** before making any changes.
-   **Do not manually edit `js/version.js`**. It is auto-generated.
-   If you want to increment the major or minor version, update the `VERSION` file.
-   The commit message of your *previous* commit (or the one you are about to make, depending on how you view it) will be reflected in the "LATEST" message. In the context of a pre-commit hook, it uses the current HEAD, which is the commit *before* the one being created.

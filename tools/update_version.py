import subprocess
import os
import json

def get_git_revision_count():
    try:
        return subprocess.check_output(['git', 'rev-list', '--count', 'HEAD']).decode('utf-8').strip()
    except Exception:
        return "0"

def get_latest_commit_message():
    try:
        # Get the latest commit message.
        # If we are in a pre-commit hook, this might be the PREVIOUS commit.
        return subprocess.check_output(['git', 'log', '-1', '--pretty=%s']).decode('utf-8').strip()
    except Exception:
        return "Initial release"

def update_version():
    if not os.path.exists('VERSION'):
        with open('VERSION', 'w') as f:
            f.write('0.5')

    with open('VERSION', 'r') as f:
        base_version = f.read().strip()

    rev_count = get_git_revision_count()
    version = f"v{base_version}.{rev_count}"
    latest_msg = get_latest_commit_message()

    # Use json.dumps to safely escape the string for JavaScript
    safe_version = json.dumps(version)
    safe_latest_msg = json.dumps(latest_msg)

    content = f"""// Auto-generated version file
const GAME_VERSION = {safe_version};
const LATEST_CHANGE = {safe_latest_msg};

if (typeof window !== 'undefined') {{
    window.GAME_VERSION = GAME_VERSION;
    window.LATEST_CHANGE = LATEST_CHANGE;
}}
"""

    os.makedirs('js', exist_ok=True)
    with open('js/version.js', 'w') as f:
        f.write(content)

    print(f"Updated js/version.js to {version}")

if __name__ == "__main__":
    update_version()

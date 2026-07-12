import subprocess
import os
import json

def get_git_revision_count():
    try:
        return subprocess.check_output(['git', 'rev-list', '--count', 'HEAD']).decode('utf-8').strip()
    except Exception:
        return "0"

def get_changelog():
    try:
        # Try to get merge commits from origin/main
        # If origin/main doesn't exist or we are not connected, it might fail.
        # Fallback to HEAD if needed.
        ref = "origin/main"
        try:
            subprocess.check_call(['git', 'rev-parse', '--verify', ref], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except subprocess.CalledProcessError:
            ref = "HEAD"

        log_output = subprocess.check_output([
            'git', 'log', ref, '--merges', '--pretty=format:%h|%s|%b<END_OF_COMMIT>'
        ]).decode('utf-8').strip()

        if not log_output:
             # Fallback to all commits if no merges found
             log_output = subprocess.check_output([
                'git', 'log', ref, '-n', '15', '--pretty=format:%h|%s|%b<END_OF_COMMIT>'
            ]).decode('utf-8').strip()

        commits = []
        for entry in log_output.split('<END_OF_COMMIT>'):
            if not entry.strip(): continue
            parts = entry.strip().split('|', 2)
            if len(parts) >= 2:
                commits.append({
                    'hash': parts[0],
                    'title': parts[1],
                    'body': parts[2].strip() if len(parts) > 2 else ""
                })
        return commits
    except Exception as e:
        print(f"Error getting changelog: {e}")
        return []

def get_latest_commit_message():
    try:
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

    # JS version file
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

    # version.json for update checking
    with open('version.json', 'w') as f:
        json.dump({"version": version}, f, indent=2)

    # changelog.json
    changelog_data = {
        "credits": [
            {"role": "Coder", "name": "Jameson Wright"},
            {"role": "Music Creator", "name": "Lincoln Callahan"}
        ],
        "history": get_changelog()
    }
    with open('changelog.json', 'w') as f:
        json.dump(changelog_data, f, indent=2)

    print(f"Updated versioning files to {version}")

if __name__ == "__main__":
    update_version()

#!/usr/bin/env bash
set -euo pipefail

# Simple helper to add, commit, and push changes.
# Prompts for commit message and target branch.

# Ensure we run at repo root
cd "$(git rev-parse --show-toplevel)"

echo "Current branch: $(git rev-parse --abbrev-ref HEAD)"
read -rp "Enter branch to push to (press Enter to use current): " target_branch
if [[ -z "${target_branch}" ]]; then
  target_branch="$(git rev-parse --abbrev-ref HEAD)"
fi

read -rp "Enter commit message: " commit_msg
if [[ -z "${commit_msg}" ]]; then
  echo "Commit message is required." >&2
  exit 1
fi

echo "Adding all tracked/untracked changes..."
git add -A

echo "Creating commit..."
git commit -m "${commit_msg}"

echo "Pushing to origin/${target_branch}..."
git push origin "${target_branch}"

echo "Done."

#!/bin/bash

cp tools/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
echo "Git pre-commit hook installed."

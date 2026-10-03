#!/bin/zsh
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "请先安装 Node.js 22.12 或更高版本，然后重新打开此文件。"
  read -k 1
  exit 1
fi
if [ ! -d node_modules ]; then
  npm install --no-audit --no-fund || exit 1
fi
npm run dev

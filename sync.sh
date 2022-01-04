#! /bin/bash

BASE_PATH="${1:-./DemoVault}"
yarn build
rm -rf "$BASE_PATH/.obsidian/plugins/obsidian-plugin-todo/"
mkdir -p "$BASE_PATH/.obsidian/plugins/obsidian-plugin-todo/"
cp main.js manifest.json styles.css "$BASE_PATH/.obsidian/plugins/obsidian-plugin-todo/"

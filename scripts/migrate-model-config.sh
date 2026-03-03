#!/bin/sh
#
# migrate-model-config.sh
#
# Migration helper for gemini-mcp-server model configuration.
#
# DEPRECATION NOTICE:
#   The following model names are deprecated and will be removed in March 2026:
#     - gemini-3-pro-preview
#     - gemini-3-pro-image-preview
#
#   Replace them with the current recommended models:
#     - gemini-3-pro-preview       -> gemini-2.5-pro
#     - gemini-3-pro-image-preview -> gemini-2.0-flash-preview-image-generation
#
# Usage: sh scripts/migrate-model-config.sh
#
# Exit codes:
#   0 - No deprecated model names found
#   1 - Deprecated model names detected (action required)

DEPRECATED_MODELS="gemini-3-pro-preview gemini-3-pro-image-preview"

REPLACEMENT_gemini_3_pro_preview="gemini-2.5-pro"
REPLACEMENT_gemini_3_pro_image_preview="gemini-2.0-flash-preview-image-generation"

CONFIG_PATHS="
$HOME/.config/claude/claude_desktop_config.json
$HOME/Library/Application Support/Claude/claude_desktop_config.json
$HOME/.claude/claude_desktop_config.json
$HOME/.cursor/mcp.json
.claude.json
claude_desktop_config.json.example
"

found_deprecated=0

get_replacement() {
    model="$1"
    case "$model" in
        gemini-3-pro-preview)
            echo "gemini-2.5-pro"
            ;;
        gemini-3-pro-image-preview)
            echo "gemini-2.0-flash-preview-image-generation"
            ;;
        *)
            echo ""
            ;;
    esac
}

check_env_var() {
    if [ -n "$GEMINI_MODEL" ]; then
        for deprecated in $DEPRECATED_MODELS; do
            if [ "$GEMINI_MODEL" = "$deprecated" ]; then
                replacement=$(get_replacement "$deprecated")
                echo "WARNING: GEMINI_MODEL environment variable uses deprecated model: $deprecated"
                echo "  Recommended replacement: $replacement"
                echo "  Update your environment:"
                echo "    export GEMINI_MODEL=$replacement"
                echo ""
                found_deprecated=1
            fi
        done
    fi
}

check_config_file() {
    filepath="$1"
    if [ ! -f "$filepath" ]; then
        return
    fi

    for deprecated in $DEPRECATED_MODELS; do
        if grep -qF "$deprecated" "$filepath" 2>/dev/null; then
            replacement=$(get_replacement "$deprecated")
            echo "WARNING: Deprecated model '$deprecated' found in: $filepath"
            echo "  Recommended replacement: $replacement"
            echo "  To update, run:"
            echo "    sed -i.bak 's/$deprecated/$replacement/g' \"$filepath\""
            echo ""
            found_deprecated=1
        fi
    done
}

echo "=== gemini-mcp-server Model Migration Check ==="
echo "Checking for deprecated model names (end-of-life: March 2026)..."
echo ""

check_env_var

for config_path in $CONFIG_PATHS; do
    check_config_file "$config_path"
done

if [ "$found_deprecated" -eq 0 ]; then
    echo "No deprecated model names found. Your configuration is up to date."
    exit 0
else
    echo "Action required: Replace deprecated model names before March 2026."
    echo "See https://github.com/mnthe/gemini-mcp-server for current model documentation."
    exit 1
fi

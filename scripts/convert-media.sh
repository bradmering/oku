#!/bin/bash
# convert-media.sh — turn a raw trip dump into web-ready media.
#
# Usage:
#   ./scripts/convert-media.sh <input-dir> --slug <slug> [options]
#
# Options:
#   --out DIR        Output root (default .media). Files land in
#                    <out>/images/<slug>/ and <out>/videos/<slug>/, mirroring
#                    the keys the documents use, so `MEDIA_SOURCE=<out> npm run
#                    upload-media` needs no path rewriting.
#   --slug SLUG      Story slug — required; it is the key prefix.
#   --max PX         Max image edge (default 2400)
#   --quality N      WebP quality (default 85)
#   --images-only    Skip video
#   --video-only     Skip images
#   --live-photos    Also transcode Live Photo clips (a video with a same-stem
#                    still). Skipped by default — ingest collapses them.
#   --force          Re-convert files that already exist in the output
#   --dry-run        Print the plan only
#
# Images: HEIC/JPG/PNG → WebP via ImageMagick, the same treatment as the blog's
# convert-to-webp.sh.
#
# Video: iPhone clips are **HEVC**, which Safari plays and Chrome and Firefox do
# not. They are transcoded to H.264/AAC — a re-encode, not a remux — and a poster
# frame is pulled in the same pass. This is the expensive half of ingest and the
# clearest argument for moving transcoding to a background service; see
# spec/09-white-rim-friction.md.

set -uo pipefail

INPUT_DIR=""
OUT_ROOT=".media"
SLUG=""
MAX_PX=2400
QUALITY=85
DO_IMAGES=true
DO_VIDEO=true
LIVE=false
FORCE=false
DRY_RUN=false

while [ $# -gt 0 ]; do
  case "$1" in
    --out)         OUT_ROOT="$2"; shift 2 ;;
    --slug)        SLUG="$2";     shift 2 ;;
    --max)         MAX_PX="$2";   shift 2 ;;
    --quality)     QUALITY="$2";  shift 2 ;;
    --images-only) DO_VIDEO=false;  shift ;;
    --video-only)  DO_IMAGES=false; shift ;;
    --live-photos) LIVE=true;        shift ;;
    --force)       FORCE=true;      shift ;;
    --dry-run)     DRY_RUN=true;    shift ;;
    -h|--help)     grep '^#' "$0" | grep -v '^#!/' | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*)            echo "Unknown option: $1" >&2; exit 1 ;;
    *)             INPUT_DIR="$1"; shift ;;
  esac
done

[ -z "$INPUT_DIR" ] && { echo "Usage: $(basename "$0") <input-dir> --slug <slug> [options]" >&2; exit 1; }
[ -z "$SLUG" ]      && { echo "Error: --slug is required" >&2; exit 1; }
[ -d "$INPUT_DIR" ] || { echo "Error: '$INPUT_DIR' is not a directory" >&2; exit 1; }

command -v magick >/dev/null 2>&1 || { echo "Error: ImageMagick not found (brew install imagemagick)" >&2; exit 1; }
command -v ffmpeg >/dev/null 2>&1 || { echo "Error: ffmpeg not found (brew install ffmpeg)" >&2; exit 1; }

IMG_OUT="$OUT_ROOT/images/$SLUG"
VID_OUT="$OUT_ROOT/videos/$SLUG"
mkdir -p "$IMG_OUT" "$VID_OUT"

echo "Input  → $INPUT_DIR"
echo "Images → $IMG_OUT   (max ${MAX_PX}px, q${QUALITY})"
echo "Video  → $VID_OUT   (H.264 + poster)"
$DRY_RUN && echo "[dry-run — nothing written]"
echo ""

# ── images ───────────────────────────────────────────────────────────────────
IMG_OK=0; IMG_SKIP=0; IMG_FAIL=0
if $DO_IMAGES; then
  while IFS= read -r src; do
    base=$(basename "$src"); name="${base%.*}"
    dest="$IMG_OUT/${name}.webp"
    if ! $FORCE && [ -f "$dest" ]; then IMG_SKIP=$((IMG_SKIP+1)); continue; fi
    if $DRY_RUN; then printf "  would  %s → %s.webp\n" "$base" "$name"; IMG_OK=$((IMG_OK+1)); continue; fi
    if magick "$src" -auto-orient -resize "${MAX_PX}x${MAX_PX}>" -quality "$QUALITY" "$dest" 2>/dev/null; then
      IMG_OK=$((IMG_OK+1)); printf "\r  images: %d converted   " "$IMG_OK"
    else
      IMG_FAIL=$((IMG_FAIL+1)); printf "\n  ✗ %s\n" "$base"
    fi
  done < <(find "$INPUT_DIR" -maxdepth 1 -type f \
    \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.heic" -o -iname "*.heif" \) | sort)
  echo ""
fi

# ── video ────────────────────────────────────────────────────────────────────
VID_OK=0; VID_SKIP=0; VID_FAIL=0; VID_LIVE=0
if $DO_VIDEO; then
  while IFS= read -r src; do
    base=$(basename "$src"); name="${base%.*}"
    dest="$VID_OUT/${name}.mp4"; poster="$VID_OUT/${name}.jpg"

    # Live Photo: a clip with a same-stem still is the motion half of one
    # photograph, and ingest collapses it into the still. Transcoding it would
    # burn minutes producing a file no document references. Same rule as
    # scripts/ingest-trip.ts — pairing, not duration.
    if ! $LIVE && compgen -G "$INPUT_DIR/${name}."[jJhHpP]* >/dev/null 2>&1; then
      VID_LIVE=$((VID_LIVE+1)); continue
    fi

    if ! $FORCE && [ -f "$dest" ] && [ -f "$poster" ]; then VID_SKIP=$((VID_SKIP+1)); continue; fi
    if $DRY_RUN; then printf "  would  %s → %s.mp4 + poster\n" "$base" "$name"; VID_OK=$((VID_OK+1)); continue; fi

    # -movflags +faststart puts the index first so the browser can start playing
    # before the whole file lands. videotoolbox is Apple hardware encoding.
    if ffmpeg -nostdin -y -i "$src" \
        -vf "scale='min(1920,iw)':-2" \
        -c:v h264_videotoolbox -b:v 6M -c:a aac -b:a 128k \
        -movflags +faststart "$dest" </dev/null >/dev/null 2>&1; then
      ffmpeg -nostdin -y -i "$dest" -vf "thumbnail,scale='min(1600,iw)':-2" -frames:v 1 \
        -q:v 4 "$poster" </dev/null >/dev/null 2>&1
      VID_OK=$((VID_OK+1)); printf "\r  video: %d transcoded   " "$VID_OK"
    else
      VID_FAIL=$((VID_FAIL+1)); printf "\n  ✗ %s\n" "$base"
    fi
  done < <(find "$INPUT_DIR" -maxdepth 1 -type f \
    \( -iname "*.mp4" -o -iname "*.mov" -o -iname "*.m4v" \) | sort)
  echo ""
fi

echo ""
echo "Images: ${IMG_OK} converted, ${IMG_SKIP} skipped, ${IMG_FAIL} failed"
echo "Video:  ${VID_OK} transcoded, ${VID_SKIP} skipped, ${VID_FAIL} failed, ${VID_LIVE} Live Photo clip(s) ignored"
echo ""
echo "Next:  MEDIA_SOURCE=$OUT_ROOT npm run upload-media -- --dry-run"

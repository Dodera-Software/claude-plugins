#!/usr/bin/env bash
# Renders videos inside Docker, so no browser is installed on the host. Starts Docker Desktop if
# it has to and stops it again afterwards, so nothing is left running.
#
#   ./render.sh                          list the videos
#   ./render.sh AcmeTeaser-en            → out/acme-teaser-en-4k.mp4, -1080p.mp4, -poster.png, -thumbnail.jpg
#   ./render.sh AcmeTeaser-en still 120 900  single frames, to check a layout
#   ./render.sh sheet ~/Downloads/reference.mp4  2 frames a second on contact sheets, to study a video
#   ./render.sh setup                    get the render image ready (the first time: about 3 GB, 5–10 minutes)
#   ./render.sh clean                    remove render images other than this one (also done after every new build)
#   ./render.sh capture <folder>         screenshots of the running app from src/videos/<folder>/capture.json
#                                        (login details as VIDEO_* environment variables)
#   ./render.sh site <url> <folder> [/page …]  colours, fonts, logo, wording and screenshots of a
#                                        public website → public/site/<folder>/
set -euo pipefail
cd "$(dirname "$0")"

VIDEO="${1:-}"
if [ "$VIDEO" = "sheet" ]; then
  REFERENCE="$(cd "$(dirname "${2:?give the video to study}")" && pwd)/$(basename "$2")"
fi
if [ -z "$VIDEO" ]; then
  node scripts/timeline.mjs --ids
  exit 0
fi
SLUG="$(echo "$VIDEO" | sed -E 's/([a-z0-9])([A-Z])/\1-\2/g' | tr '[:upper:]' '[:lower:]')"

# Named after what goes into it, so projects on the same kit share one image. The lockfile is left
# out on purpose: `npm install` rewrites it without changing anything the image needs.
IMAGE="video-kit:$(shasum package.json Dockerfile fonts.conf | shasum | cut -c1-12)"
STARTED_DOCKER=0
DOCKER_APP="/Applications/Docker.app/Contents/MacOS/Docker"

# Docker Desktop sometimes ignores "quit"; give it 20 seconds, then stop it.
stop_docker() {
  [ "$STARTED_DOCKER" = 1 ] || return 0
  osascript -e 'quit app "Docker"' >/dev/null 2>&1
  for _ in $(seq 1 20); do pgrep -f "$DOCKER_APP" >/dev/null || break; sleep 1; done
  sleep 5
  # Whatever ignored "quit": the app, its backend and build processes, and the agent helper it
  # leaves behind on every start.
  # pkill fails when nothing is left to stop; under set -e that would end the script with an error.
  pkill -f "/Applications/Docker.app/Contents/MacOS/" || true
  pkill -f "Docker.app/Contents/Resources/cli-plugins/docker-agent serve api" || true
  return 0
}
trap stop_docker EXIT

# A half-started engine makes `docker ps` hang instead of fail, so every check gets 5 seconds
# (macOS has no `timeout`; perl's alarm does the same).
docker_answers() {
  perl -e 'alarm 5; exec @ARGV' docker ps >/dev/null 2>&1
}

docker_ready() {
  for _ in $(seq 1 "$1"); do docker_answers && return 0; sleep 1; done
  return 1
}

# Docker Desktop sometimes hangs while starting, or ignores `open` while it is still quitting.
# Let any shutdown finish, start it, and if the engine never answers, quit it fully and try once more.
launch_docker() {
  for _ in $(seq 1 30); do pgrep -f "$DOCKER_APP" >/dev/null || break; sleep 1; done
  if pgrep -f "$DOCKER_APP" >/dev/null; then pkill -f "$DOCKER_APP"; sleep 3; fi
  open -a Docker
}

if ! docker_answers; then
  echo "Starting Docker Desktop..."
  STARTED_DOCKER=1
  launch_docker
  if ! docker_ready 120; then
    echo "Docker is stuck starting; restarting it once..."
    osascript -e 'quit app "Docker"' >/dev/null 2>&1
    launch_docker
    docker_ready 150 || { echo "Docker did not start"; exit 1; }
  fi
fi

# Every render image except this project's current one, the layers rebuilds leave untagged and the
# build cache: each is 2-3 GB, and a new kit version makes a new one.
remove_old_images() {
  OLD="$(docker images --format '{{.Repository}}:{{.Tag}}' | grep '^video-kit:' | grep -v "^$IMAGE$" || true)"
  [ -n "$OLD" ] && echo "$OLD" | xargs docker rmi >/dev/null 2>&1 || true
  docker image prune -f >/dev/null
  docker builder prune -f >/dev/null
}

if [ "$VIDEO" = "clean" ]; then
  remove_old_images
  echo "Removed: ${OLD:-nothing}" | tr '\n' ' '; echo
  exit 0
fi

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "Setting up the video app: a one-time download of about 3 GB, usually 5–10 minutes..."
  docker build -t "$IMAGE" .
  remove_old_images
fi
# A build interrupted by Docker stopping can leave empty files in the image; rebuild it clean.
if [ "$(docker run --rm --entrypoint sh "$IMAGE" -c 'wc -c < package.json')" -lt 10 ]; then
  docker build --no-cache -t "$IMAGE" .
fi
if [ "$VIDEO" = "setup" ]; then
  echo "The video app is ready."
  exit 0
fi
mkdir -p out

# Only VIDEO_* variables reach the container (login details for capture); nothing else leaks in.
ENV_ARGS=()
for name in $(env | sed -n 's/^\(VIDEO_[A-Za-z0-9_]*\)=.*/\1/p'); do ENV_ARGS+=(-e "$name"); done

remotion() {
  docker run --rm ${ENTRYPOINT:+--entrypoint "$ENTRYPOINT"} ${EXTRA_MOUNT:+-v "$EXTRA_MOUNT"} \
    ${ENV_ARGS[@]+"${ENV_ARGS[@]}"} \
    --add-host=host.docker.internal:host-gateway \
    -v "$PWD/src:/video/src:ro" \
    -v "$PWD/public:/video/public:${PUBLIC_MODE:-ro}" \
    -v "$PWD/remotion.config.ts:/video/remotion.config.ts:ro" \
    -v "$PWD/tsconfig.json:/video/tsconfig.json:ro" \
    -v "$PWD/scripts:/video/scripts:ro" \
    -v "$PWD/out:/video/out" \
    "$IMAGE" "$@"
}

if [ "$VIDEO" = "sheet" ]; then
  NAME="$(basename "${REFERENCE%.*}")"
  EXTRA_MOUNT="$(dirname "$REFERENCE"):/reference:ro" ENTRYPOINT=ffmpeg remotion -v error -y \
    -i "/reference/$(basename "$REFERENCE")" -vf "fps=2,scale=480:-2,tile=5x4" \
    "out/$NAME-sheet-%02d.png"
  echo "Contact sheets: out/$NAME-sheet-*.png (20 frames each, 0.5 s apart)"
  exit 0
fi

if [ "$VIDEO" = "capture" ]; then
  FOLDER="${2:?give the video folder under src/videos, e.g. launch}"
  [ -f "src/videos/$FOLDER/capture.json" ] || { echo "No src/videos/$FOLDER/capture.json"; exit 1; }
  echo "Capturing from the running app (it must be up, with its database and demo data)..."
  PUBLIC_MODE=rw ENTRYPOINT=node remotion scripts/capture.mjs "src/videos/$FOLDER/capture.json" "public/captures/$FOLDER"
  echo "Done: public/captures/$FOLDER/"
  exit 0
fi

if [ "$VIDEO" = "site" ]; then
  URL="${2:?give the website address, e.g. https://example.com}"
  FOLDER="${3:?give a folder name for what is read, e.g. launch}"
  echo "Reading $URL (colours, fonts, logo, wording, screenshots)..."
  PUBLIC_MODE=rw ENTRYPOINT=node remotion scripts/site.mjs "$URL" "public/site/$FOLDER" "${@:4}"
  echo "Done: public/site/$FOLDER/"
  exit 0
fi

remotion bundle src/index.ts --out-dir=out/bundle >/dev/null

if [ "${2:-}" = "still" ]; then
  shift 2
  for frame in "$@"; do
    remotion still out/bundle "$VIDEO" "out/$SLUG-frame-$frame.png" --frame="$frame" --log=error
  done
  rm -rf out/bundle
  exit 0
fi

# The same frames drawn at twice the pixel density: a 3840×2160 master for YouTube and big
# screens, and 1080p for social posts, where platforms re-encode anyway.
remotion render out/bundle "$VIDEO" "out/$SLUG-4k.mp4" --scale=2
remotion render out/bundle "$VIDEO" "out/$SLUG-1080p.mp4"
remotion still out/bundle "$VIDEO" "out/$SLUG-poster.png" --frame=0 --scale=2
rm -rf out/bundle
ENTRYPOINT=node remotion scripts/finish.mjs "$SLUG"
echo "Done: out/$SLUG-4k.mp4, out/$SLUG-1080p.mp4, out/$SLUG-poster.png, out/$SLUG-thumbnail.jpg"

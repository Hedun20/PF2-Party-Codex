# World theme media assets

Use this folder for local, licensed ambience/video files. Keep repository-safe assets here; do not commit game/movie rips or unknown-license downloads.

Recommended layout:

```txt
world-themes/
  fire/
    fire-loop.webm
    fire-poster.jpg
    fire-wallpaper.jpg
    fire-ambience.mp3
    fire-theme.mp3
  frost/
    frost-loop.webm
    frost-poster.jpg
    frost-ambience.ogg
```

In a world article frontmatter:

```yaml
theme: fire
backgroundMode: video # theme | image | video
backgroundImage: fire/fire-wallpaper.jpg
backgroundVideo: fire/fire-loop.webm
backgroundPoster: fire/fire-poster.jpg
backgroundOpacity: 0.42
backgroundDim: 0.58
backgroundBlur: 0
ambienceMode: auto
ambienceAudio: fire/fire-ambience.mp3
ambienceLabel: Костёр и далёкий ветер
ambienceAutoplay: true # after the user grants world-audio permission once
ambienceCredits: Pixabay / Freesound CC0 / own recording
ambienceSourceUrl: https://...
backgroundCredits: Mixkit / Pixabay / own recording
backgroundSourceUrl: https://...
musicSource: youtube # off | youtube | local
musicUrl: https://music.youtube.com/watch?v=...
musicAudio: fire/fire-theme.mp3
musicLabel: Музыка мира
musicDisplay: compact # compact | mini
musicAutoplay: false # local files only, after world-audio permission
musicLoop: true
musicCredits: YouTube / YouTube Audio Library / author / own file
```

Path rules:

- `fire/fire-loop.webm` resolves to `/world-themes/fire/fire-loop.webm`.
- `/world-themes/fire/fire-loop.webm` also works.
- Full external URLs are allowed technically, but local files are preferred for LAN/offline use.

Audio rules:

- Browsers require at least one user click before world audio can autoplay. After that, `ambienceAutoplay: true` and local `musicAutoplay: true` can try to start when you enter a world.
- YouTube stays compact by default and does not render a large preview unless you open the mini-player.
- Local MP3/OGG is the clean audio-only option.
- `ambienceMode: auto` uses the MP3/OGG file when present; otherwise it uses the soft synthetic preview.
- `ambienceMode: file` disables synthetic fallback and only plays the file.
- `ambienceMode: synthetic` ignores the file and uses the soft preview.
- `ambienceMode: off` disables ambience for that world.

Licensing rules:

- Safe choices: your own files, CC0, public-domain, or stock assets whose license allows your use.
- If attribution is required, keep author/source/license in `ambienceCredits` / `backgroundCredits`.
- Do not download and repackage YouTube/game/movie audio or video unless you have a license for that exact use.
- `musicSource: youtube` uses an official embedded YouTube player opened by user click. It does not extract MP3/audio streams and it does not autoplay hidden music.
- `musicSource: local` uses `musicAudio` and can be shown as a clean text-only player.
- Stock links such as iStock/Pexels/Mixkit belong in `backgroundSourceUrl` / `backgroundCredits`; the actual background should be a local licensed WebM/MP4 file.

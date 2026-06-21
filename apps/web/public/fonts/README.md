# World theme media

This folder is reserved for optional local cinematic assets used by world themes.

Recommended structure:

```txt
world-themes/
  fire/
    fire-loop.webm
    fire-poster.jpg
    fire-ambience.mp3
  frost/
    frost-loop.webm
    frost-poster.jpg
    frost-ambience.mp3
```

In a world article frontmatter you can reference them as:

```yaml
theme: fire
backgroundVideo: fire/fire-loop.webm
backgroundPoster: fire/fire-poster.jpg
ambienceAudio: fire/fire-ambience.mp3
ambienceLabel: Треск огня и лава
```

Use only media you own, generated yourself, or have a clear license for. Do not commit ripped game/movie/YouTube audio or video.

If no media files are provided, the app uses built-in CSS cinematic backgrounds and generated WebAudio ambience.

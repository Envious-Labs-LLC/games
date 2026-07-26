# Lanka environment art pass

Generated with OpenAI built-in image generation on 2026-07-25.

Style reference for every image:
`../backgrounds/leap-to-lanka-night.png`

Shared direction:

- painterly mythic Indian fantasy matching the existing moonlit Lanka backdrop
- deep blue-green stone, aged bronze, muted cyan wind magic, restrained warm gold
- readable at side-scrolling gameplay scale
- original prototype artwork; no logos, text, UI, or modern objects

## Atmospheric layers

### Valley mist

Wide translucent banks of moonlit valley mist and low sea haze with soft
feathered edges. Sparse detail, mostly horizontal flow. Black background so the
game can composite the light using Screen blending.

### High clouds

Wide, soft moonlit cloud banks for the upper sky. Painterly, sparse and
low-contrast, with feathered edges. Black background for Screen blending.

### Wind wisp

One broad, elegant ribbon of pale cyan-white wind, with a tapered calligraphic
shape and scattered soft vapor. No hard outline. Black background for Screen
blending.

## Foreground world kit

### Platform cap

Long seamless Lanka temple-platform cap seen straight from the side: cracked
dark blue-green stone, worn carved trim, small moss traces, and restrained
bronze detail. Bright magenta isolation background for transparent extraction.

### Stone wall

Seamless square wall texture for platform bodies: weathered Lanka temple
masonry, shallow arches and carved blocks, dark blue-green stone, subtle moss,
moonlit highlights, no perspective.

### Cracked barrier

Tall destructible temple-stone barrier seen straight from the side. Heavy
fractures radiate through stacked carved blocks, with a faint warm magical glow
inside the cracks. Bright magenta isolation background.

### Wind anchor

Compact ancient Lanka wind shrine seen straight from the side: a carved stone
and aged-bronze circular frame holding one clear pale-cyan spiral rune, with
short ribbon-like wind trails. Bright magenta isolation background.

### Finish shrine

Small ornate Lanka wayside shrine seen straight from the side, with carved
dark stone pillars, a stepped temple roof, aged bronze trim, and a restrained
warm golden inner light. Bright magenta isolation background.

## Runtime preparation

The atmosphere images keep their black backgrounds and use Screen blending in
Phaser. Foreground images generated on magenta were processed into transparent
PNG files with a soft chroma matte and edge despill. Full generated sources are
preserved beside the runtime images.

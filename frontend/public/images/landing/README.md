# Landing page images

Four photographs are needed for the MajiGuard landing page (`/`). They are supplied manually. Nothing in this folder is downloaded, generated or licensed by the application.

Files are served from `/images/landing/<filename>`.

## Current wiring status

| File | Section | Wired in code today |
| --- | --- | --- |
| `hero-community-water-point.jpg` | Hero | No. `landing-hero.tsx` shows a labelled placeholder with no file path. |
| `problem-water-point.jpg` | Problem | No. `landing-problem.tsx` has no image slot yet. |
| `community-impact.jpg` | Community impact | Yes. `landing-community.tsx` references `/images/landing/community-impact.jpg`. |
| `tanzania-gis-context.jpg` | Tanzania and spatial context | Yes. `landing-gis.tsx` references `/images/landing/tanzania-gis-context.jpg`. |

Until a later phase replaces the placeholders, adding a file here does not change the page. The Hero placeholder must be pointed at its file, and the Problem section needs a new image slot.

## General requirements

- Format: JPEG, sRGB, quality 80-85. Keep each file under about 400 KB after export.
- No watermarks, stock-site marks, captions or text baked into the image.
- Realistic, documentary photography with natural light. Dignity, infrastructure, community and geography are the themes.
- Do not use:
  - images of distressed children, or other poverty-focused or exaggerated-suffering imagery
  - cartoons, illustrations or AI-generated-looking imagery
  - invented or decorative maps
  - political imagery, party colours or campaign material
  - government logos, unless the photograph genuinely contains them
- Identifiable people should have given consent for use. Prefer people at a respectful distance, going about ordinary activity.
- Keep the key subject away from the edges, because the frame is cropped differently across screen sizes (`object-cover`).

---

## 1. `hero-community-water-point.jpg`

| Field | Detail |
| --- | --- |
| Landing section | Hero (top of the page) |
| Subject | A rural Tanzanian community at a working water point: people collecting or using water, the water point itself clearly visible, natural surroundings. |
| Purpose | Establish immediately that the system is about real water points and the communities who rely on them. |
| Aspect ratio | 16:9 |
| Orientation | Landscape |
| Minimum resolution | 1920 x 1080 px (2400 x 1350 px preferred) |
| Focal point | The water point and the people using it, in the centre or slightly below centre. Leave calm space, such as sky or ground, around the subject. |
| Usage | Beside the Hero text from the `lg` breakpoint, and below it on smaller screens. It is not used as a full-bleed background, and no text is overlaid on it. Keep it legible when cropped to a narrower frame. |
| Avoid | Dramatic or distressing scenes, a broken or dry water point as the main subject, and crowds that hide the infrastructure. |

## 2. `problem-water-point.jpg`

| Field | Detail |
| --- | --- |
| Landing section | Problem ("When a water point becomes unreliable...") |
| Subject | Realistic water-point infrastructure in an ordinary rural setting, such as a handpump, tap stand or storage tank. Wear or age may be visible. It must not look staged or exaggerated. |
| Purpose | Ground the decision challenge in real infrastructure, so the section reads as a practical maintenance problem and not an abstract one. |
| Aspect ratio | 4:3 |
| Orientation | Landscape |
| Minimum resolution | 1600 x 1200 px |
| Focal point | The infrastructure, filling roughly the middle two-thirds of the frame. |
| Usage | A supporting image beside the Problem text. Needs a new image slot, since the section has none today. It should work on a light and a dark page background without relying on transparent edges. |
| Avoid | Images of people in distress, and anything implying blame on a named institution or community. |

## 3. `community-impact.jpg`

| Field | Detail |
| --- | --- |
| Landing section | Community impact ("Behind every water point is a community that relies on it.") |
| Subject | A dignified, everyday scene of water access in a Tanzanian community: people collecting, carrying or using water, or a community gathered near a water point. |
| Purpose | Connect better prioritization to the people ultimately served by reliable water services. |
| Aspect ratio | 16:9 |
| Orientation | Landscape |
| Minimum resolution | 1600 x 900 px (1920 x 1080 px preferred) |
| Focal point | People and water together, in the centre third. Keep faces unobscured only where consent exists, and prefer natural, unposed moments. |
| Usage | Image column beside the text from `lg`; below the text on mobile. Shown in a 16:9 frame (`aspect-video`) with `object-cover`. |
| Avoid | Distress, hardship or pity as the theme, and posed "charity" compositions. |

## 4. `tanzania-gis-context.jpg`

| Field | Detail |
| --- | --- |
| Landing section | Tanzania and spatial context ("Water-point decisions are tied to place.") |
| Subject | Genuine geographic context for Tanzania, such as aerial or satellite imagery of landscape, a river or settlement pattern, or a photograph of fieldwork with GPS or mapping equipment. |
| Purpose | Show that decisions depend on geography, supporting the Tanzania, Region, District, Ward and Water point hierarchy beside it. |
| Aspect ratio | 16:9 |
| Orientation | Landscape |
| Minimum resolution | 1600 x 900 px (1920 x 1080 px preferred) |
| Focal point | Landscape features or settlements across the middle of the frame, with an even texture and no single point the eye must find. |
| Usage | Image column beside the text from `lg`; below the text on mobile. Shown in a 16:9 frame (`aspect-video`) with `object-cover`. |
| Avoid | Invented, generated or decorative maps, or map overlays implying data MajiGuard did not produce. Use only imagery you have the right to publish, and credit it if the licence requires. |

---

## Notes for whoever supplies the images

- Provide alt text with each image. The text in the page's placeholders is only a stand-in, and the final `aria-label` or `alt` should describe what is actually in the photograph, in both English and Swahili.
- Before publishing, confirm that you have the right to use each photograph and, where people are identifiable, their consent.

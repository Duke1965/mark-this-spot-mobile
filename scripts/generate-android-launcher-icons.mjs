/**
 * Regenerates Android adaptive launcher icons from Mappo source assets.
 * Source: public/brand/mappo/ic_launcher_foreground.png, ic_launcher_background.png
 * Output: android/app/src/main/res/mipmap-*/
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const SRC_FG = path.join(ROOT, "public/brand/mappo/ic_launcher_foreground.png")
const SRC_BG = path.join(ROOT, "public/brand/mappo/ic_launcher_background.png")
const RES_ROOT = path.join(ROOT, "android/app/src/main/res")

const DENSITIES = {
  "mipmap-mdpi": 108,
  "mipmap-hdpi": 162,
  "mipmap-xhdpi": 216,
  "mipmap-xxhdpi": 324,
  "mipmap-xxxhdpi": 432,
}

const ADAPTIVE_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function writePng(buffer, outPath) {
  await ensureDir(path.dirname(outPath))
  await fs.writeFile(outPath, buffer)
}

async function main() {
  for (const src of [SRC_FG, SRC_BG]) {
    try {
      await fs.access(src)
    } catch {
      console.error(`Missing source: ${src}`)
      process.exit(1)
    }
  }

  for (const [folder, size] of Object.entries(DENSITIES)) {
    const dir = path.join(RES_ROOT, folder)
    await ensureDir(dir)

    const fg = await sharp(SRC_FG).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
    const bg = await sharp(SRC_BG).resize(size, size, { fit: "cover" }).png().toBuffer()

    await writePng(fg, path.join(dir, "ic_launcher_foreground.png"))
    await writePng(bg, path.join(dir, "ic_launcher_background.png"))

    const legacy = await sharp(SRC_BG)
      .resize(size, size, { fit: "cover" })
      .composite([{ input: await sharp(SRC_FG).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), gravity: "centre" }])
      .png()
      .toBuffer()
    await writePng(legacy, path.join(dir, "ic_launcher.png"))
    await writePng(legacy, path.join(dir, "ic_launcher_round.png"))
  }

  const anydpi = path.join(RES_ROOT, "mipmap-anydpi-v26")
  await ensureDir(anydpi)
  await fs.writeFile(path.join(anydpi, "ic_launcher.xml"), ADAPTIVE_ICON_XML)
  await fs.writeFile(path.join(anydpi, "ic_launcher_round.xml"), ADAPTIVE_ICON_XML)

  console.log("Android launcher icons generated under android/app/src/main/res/")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

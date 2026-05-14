import { Resvg } from '@resvg/resvg-js'
import pngToIco from 'png-to-ico'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

// Icon SVG — badge version with accent background + white elements
const SVG = `
<svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="44" height="44" rx="10" fill="#6c63ff"/>
  <path d="M 8.1,12.2 A 17,17 0 0,1 38.9,23.5" stroke="white" stroke-width="3.2" stroke-linecap="round"/>
  <polygon points="36.2,20.8 41.8,21.3 38.5,27.5" fill="white"/>
  <path d="M 35.9,31.8 A 17,17 0 0,1 5.1,20.5" stroke="white" stroke-width="3.2" stroke-linecap="round"/>
  <polygon points="2.2,22.7 7.8,23.2 5.5,16.5" fill="white"/>
  <polygon points="19,14 25,14 25,19 30,19 30,25 25,25 25,30 19,30 19,25 14,25 14,19 19,19" fill="white"/>
  <polygon points="22,15.5 20,19 24,19" fill="#6c63ff"/>
  <polygon points="22,28.5 20,25 24,25" fill="#6c63ff"/>
  <polygon points="15.5,22 19,20 19,24" fill="#6c63ff"/>
  <polygon points="28.5,22 25,20 25,24" fill="#6c63ff"/>
</svg>
`

function renderPng(size) {
  const resvg = new Resvg(SVG, { fitTo: { mode: 'width', value: size } })
  return Buffer.from(resvg.render().asPng())
}

// 512x512 PNG for resources/ and build/
const png512 = renderPng(512)
fs.writeFileSync(path.join(root, 'resources', 'icon.png'), png512)
console.log('✓ resources/icon.png')
fs.writeFileSync(path.join(root, 'build', 'icon.png'), png512)
console.log('✓ build/icon.png')

// ICO with multiple sizes for Windows
const icoSizes = [16, 24, 32, 48, 64, 128, 256]
const tmpDir = path.join(root, '.icon-tmp')
fs.mkdirSync(tmpDir, { recursive: true })

const tmpPaths = icoSizes.map(size => {
  const p = path.join(tmpDir, `icon-${size}.png`)
  fs.writeFileSync(p, renderPng(size))
  return p
})

const icoBuffer = await pngToIco(tmpPaths)
fs.writeFileSync(path.join(root, 'build', 'icon.ico'), icoBuffer)
console.log('✓ build/icon.ico')

fs.rmSync(tmpDir, { recursive: true })

// ICNS with all required sizes for macOS
const iconsetDir = path.join(root, '.icon-tmp.iconset')
fs.mkdirSync(iconsetDir, { recursive: true })

const icnsSizes = [
  { size: 16,   name: 'icon_16x16.png' },
  { size: 32,   name: 'icon_16x16@2x.png' },
  { size: 32,   name: 'icon_32x32.png' },
  { size: 64,   name: 'icon_32x32@2x.png' },
  { size: 128,  name: 'icon_128x128.png' },
  { size: 256,  name: 'icon_128x128@2x.png' },
  { size: 256,  name: 'icon_256x256.png' },
  { size: 512,  name: 'icon_256x256@2x.png' },
  { size: 512,  name: 'icon_512x512.png' },
  { size: 1024, name: 'icon_512x512@2x.png' },
]

for (const { size, name } of icnsSizes) {
  fs.writeFileSync(path.join(iconsetDir, name), renderPng(size))
}

execSync(`iconutil --convert icns "${iconsetDir}" -o "${path.join(root, 'build', 'icon.icns')}"`)
fs.rmSync(iconsetDir, { recursive: true })
console.log('✓ build/icon.icns')

console.log('\nIcons generated successfully.')

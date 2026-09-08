import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateIcons() {
  const publicDir = path.resolve('public');
  const sourceImage = path.resolve('PNG logo IVF Centre.png');

  if (!fs.existsSync(sourceImage)) {
    console.error('Source image not found:', sourceImage);
    return;
  }

  console.log('🖼️ Reading source image:', sourceImage);
  const metadata = await sharp(sourceImage).metadata();
  console.log(`Source dimensions: ${metadata.width}x${metadata.height}`);

  // 1. Generate 192x192 square icon (centered with transparent background or padding)
  // Let's fit inside 192x192 with contain
  await sharp(sourceImage)
    .resize(192, 192, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png()
    .toFile(path.join(publicDir, 'pwa-192.png'));
  console.log('✅ Generated public/pwa-192.png (192x192)');

  // 2. Generate 512x512 square icon
  await sharp(sourceImage)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png()
    .toFile(path.join(publicDir, 'pwa-512.png'));
  console.log('✅ Generated public/pwa-512.png (512x512)');

  // 3. Generate 512x512 maskable icon with solid white background and 20% safe zone padding
  // Maskable icons require ~80% safe zone so circular or rounded masks do not clip the logo.
  const innerSize = Math.round(512 * 0.75); // 384x384 safe zone
  const innerBuffer = await sharp(sourceImage)
    .resize(innerSize, innerSize, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([
      {
        input: innerBuffer,
        gravity: 'center'
      }
    ])
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512.png'));
  console.log('✅ Generated public/pwa-maskable-512.png (512x512 maskable with white background & safe zone)');

  // 4. Generate apple-touch-icon (180x180) with solid white background (iOS does not support transparency)
  const iosInner = Math.round(180 * 0.85); // 153x153
  const iosInnerBuffer = await sharp(sourceImage)
    .resize(iosInner, iosInner, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .toBuffer();

  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([
      {
        input: iosInnerBuffer,
        gravity: 'center'
      }
    ])
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✅ Generated public/apple-touch-icon.png (180x180 solid white for iOS Safari)');

  console.log('🎉 All PWA icons generated successfully!');
}

generateIcons();

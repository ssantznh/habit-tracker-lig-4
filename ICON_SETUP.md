# Icon Setup for PWA

This guide will help you set up the favicon and icons for your Habit Tracker PWA.

## Files Created

- `public/manifest.json` - Web app manifest for PWA configuration
- `public/icon.svg` - SVG source icon
- `generate-icons.html` - Tool to generate all required icon sizes
- `create-favicon.html` - Tool to generate favicon.ico
- Updated `app/layout.js` with PWA meta tags

## Required Icon Files

You need to create these files in the `/public` directory:

1. `favicon.ico` (16x16 and 32x32)
2. `icon-192x192.png` (192x192)
3. `icon-512x512.png` (512x512)
4. `apple-touch-icon.png` (180x180)

## How to Generate Icons

### Method 1: Using the HTML Generators

1. Open `create-favicon.html` in your browser
2. Right-click on the 32x32 icon and save as `favicon.ico` in the `/public` directory
3. Open `generate-icons.html` in your browser
4. Right-click on each required size and save with the correct filename:
   - 192x192 → `icon-192x192.png`
   - 512x512 → `icon-512x512.png`
   - 180x180 → `apple-touch-icon.png`

### Method 2: Using Online Tools

1. Use the `icon.svg` file as a source
2. Convert to required sizes using online tools like:
   - [Favicon Generator](https://realfavicongenerator.net/)
   - [PWA Builder](https://www.pwabuilder.com/)

## Icon Design

The icons feature:
- Blue background (#3b82f6) representing the app theme
- Connect 4 style grid pattern
- Colored dots representing different habit states:
  - Green (#10b981) - Completed habits
  - Orange (#f59e0b) - Partial habits
  - Red (#ef4444) - Missed habits

## PWA Features Enabled

- Standalone app display
- Custom theme color
- Apple touch icon support
- Proper viewport configuration
- Web app manifest for installability

## Testing

After adding the icon files:

1. Run `npm run dev`
2. Open the app in your browser
3. Check the browser tab for the favicon
4. Test PWA installation on mobile devices
5. Verify icons appear correctly in app switchers

## Cleanup

After generating all required icons, you can delete:
- `generate-icons.html`
- `create-favicon.html`
- `ICON_SETUP.md` (this file)

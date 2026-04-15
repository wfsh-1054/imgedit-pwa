# PixelPerfect PWA - LLM Instructions

This file is automatically read by the AI Studio system to guide future LLM interactions.

## Application Context
Please read the `app-features.yml` file in the root directory to understand the currently implemented features, tech stack, and state management.

## Critical Rules for Code Modification
1. **Scope of Changes**: Only modify the code directly related to the user's request. Do not refactor or alter unrelated features, tabs, or state variables.
2. **Canvas Rendering**: The core image processing logic lives in `updateCanvas()` inside `ImageEditor.tsx`. It directly renders to `previewCanvasRef` to ensure the preview matches the final output 1:1. It handles cropping (using percentage-based calculations), rotation bounding boxes, and watermarking. Be extremely careful when modifying this function to avoid breaking existing transformations.
3. **Theme & i18n Consistency**: The app uses a "Sleek Interface" with both Light and Dark modes using Tailwind's `dark:` variants. Preserve these adaptive colors. All text must use the `t` object from `translations.ts` for multi-language support.
4. **No Server-Side Processing**: This is a privacy-first PWA. All image manipulation must happen in the browser using the HTML5 Canvas API.

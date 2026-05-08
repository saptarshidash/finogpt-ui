# FinoGPT Frontend

Frontend application for the FinoGPT product, built with React, TypeScript, and Vite.

## Requirements

- Node.js 20+ recommended
- npm 10+ recommended

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env
```

3. Update `VITE_API_BASE_URL` in `.env` if your backend is not running on `http://localhost:8081`.

4. Start the development server:

```bash
npm run dev
```

By default Vite serves the app at `http://localhost:5173`.

## Production Build

Build the optimized production bundle:

```bash
npm run build
```

The output is generated in `dist/`.

To verify the production bundle locally:

```bash
npm run preview
```

## Production Deployment

This project builds to static assets, so it can be deployed to any static hosting platform or behind any web server that can serve the `dist/` directory.

Recommended deployment flow:

1. Set the production value of `VITE_API_BASE_URL`.
2. Run `npm install`.
3. Run `npm run build`.
4. Deploy the contents of `dist/`.

For single-page app routing, configure your host to rewrite unknown routes to `index.html`.

## Quality Checks

Run the core checks before shipping:

```bash
npm run typecheck
npm run lint
npm run build
```

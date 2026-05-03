# Gemini AI App

A simple Node.js app that uses the Gemini API instead of Claude API.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file from `.env.example`:

```bash
copy .env.example .env
```

3. Add your Gemini API key in `.env`:

```env
GEMINI_API_KEY=your_real_api_key
```

4. Start the app:

```bash
npm start
```

5. Open:

```text
http://localhost:3000
```

## Gemini API

This app uses `@google/generative-ai` and model `gemini-2.0-flash`.

## Deploy to Render

1. Push this project to GitHub.
2. Open Render and create a new Web Service.
3. Connect the GitHub repository.
4. Use these settings:

```text
Build Command: npm install
Start Command: npm start
```

5. Add environment variable:

```env
GEMINI_API_KEY=your_real_gemini_api_key
```

Render can also detect `render.yaml`.

## Deploy to Vercel

1. Push this project to GitHub.
2. Open Vercel and import the GitHub repository.
3. Add environment variable:

```env
GEMINI_API_KEY=your_real_gemini_api_key
```

4. Deploy the project.

The project includes `vercel.json` for routing Express requests to `server.js`.

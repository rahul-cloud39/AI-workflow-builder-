import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.GEMINI_API_KEY;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, 'public');

app.use(express.json());
app.use(express.static(publicPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

function buildWorkflowPrompt(payload) {
  return `
Create a production-ready automation workflow specification.

Return only valid JSON with these keys:
title, summary, trigger, inputs, variables, steps, integrations, conditions, approvalFlow, retryPolicy, schedule, webhookPayload, securityChecks, monitoring, errorHandling, testCases, deploymentChecklist, estimatedRuntime, automationScore, yamlPreview.

Requirements:
- Workflow type: ${payload.workflowType}
- Industry: ${payload.industry}
- Goal: ${payload.goal}
- Trigger: ${payload.trigger}
- Integrations: ${payload.integrations}
- Complexity: ${payload.complexity}
- Output style: ${payload.outputStyle}
- Extra details: ${payload.details}
- Schedule: ${payload.schedule}
- Approval required: ${payload.approvalRequired}
- Retry policy: ${payload.retryPolicy}
- Data source: ${payload.dataSource}
- Output destination: ${payload.outputDestination}
- Human handoff rule: ${payload.handoffRule}

Make the workflow practical, detailed, and ready for a no-code/low-code automation builder.
Include realistic conditions, variables, webhook JSON payload, monitoring alerts, security checks, and failure recovery steps.
`;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing. Add it to your .env file.' });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(message);
    const response = result.response.text();

    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to generate response.' });
  }
});

app.post('/api/workflow', async (req, res) => {
  try {
    const payload = req.body;

    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing. Add it to your .env file.' });
    }

    if (!payload.goal || typeof payload.goal !== 'string') {
      return res.status(400).json({ error: 'Workflow goal is required.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(buildWorkflowPrompt(payload));
    const text = result.response.text().replace(/^```json|```$/g, '').trim();

    try {
      res.json(JSON.parse(text));
    } catch {
      res.json({
        title: 'Generated Workflow',
        summary: 'Gemini returned a non-JSON response. Review the generated output below.',
        rawOutput: text
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to generate workflow.' });
  }
});

app.post('/api/run-workflow', (req, res) => {
  const { workflow } = req.body;
  const steps = Array.isArray(workflow?.steps)
    ? workflow.steps
    : String(workflow?.steps || '')
      .split(',')
      .map((step) => step.trim())
      .filter(Boolean);

  if (!workflow || !steps.length) {
    return res.status(400).json({ error: 'Generate a workflow before running it.' });
  }

  res.json({
    status: 'completed',
    mode: 'safe-dry-run',
    startedAt: new Date().toISOString(),
    completedSteps: steps.map((step, index) => ({
      step: index + 1,
      name: step.name || step.title || String(step) || `Step ${index + 1}`,
      status: 'success',
      output: step.description || step.action || 'Step validated successfully.'
    })),
    message: 'Workflow dry-run completed. No external LinkedIn, CRM, email, or Slack actions were executed.'
  });
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`AI Workflow Builder running at http://localhost:${port}`);
  });
}

export default app;

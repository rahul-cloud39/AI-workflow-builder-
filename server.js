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

function buildFallbackWorkflow(payload, reason = 'Gemini API is temporarily unavailable.') {
  const isLinkedIn = String(payload.workflowType || '').toLowerCase().includes('linkedin');
  const title = isLinkedIn ? 'LinkedIn Lead Generation Workflow' : `${payload.workflowType || 'Automation'} Workflow`;

  return {
    title,
    summary: `${title} generated in fallback mode because ${reason}`,
    trigger: payload.trigger || 'Manual run',
    inputs: [
      'target_audience',
      'industry',
      'company_size',
      'job_titles',
      'location',
      'lead_source'
    ],
    variables: [
      { name: 'leadScoreThreshold', value: 80 },
      { name: 'manualReviewRequired', value: payload.approvalRequired || 'Manual review before final action' },
      { name: 'handoffRule', value: payload.handoffRule || 'If confidence is below 80%' }
    ],
    steps: isLinkedIn ? [
      { name: 'Define ICP filters', description: 'Collect target industry, job titles, geography, company size, and intent signals.' },
      { name: 'Find LinkedIn prospects', description: 'Prepare a LinkedIn Sales Navigator search plan for matching prospects.' },
      { name: 'Enrich lead profile', description: 'Normalize profile URL, company, role, seniority, and available contact fields.' },
      { name: 'Score lead', description: 'Score each prospect using fit, seniority, company size, and relevance signals.' },
      { name: 'Create CRM record', description: 'Send qualified leads to CRM or Google Sheets with status set to review.' },
      { name: 'Draft outreach', description: 'Generate a personalized connection note or email draft for manual approval.' },
      { name: 'Notify sales team', description: 'Send a Slack notification with lead summary and next recommended action.' }
    ] : [
      { name: 'Receive trigger data', description: 'Validate incoming workflow payload and required fields.' },
      { name: 'Apply conditions', description: 'Check business rules, confidence score, and routing logic.' },
      { name: 'Execute automation steps', description: 'Run the selected integrations in the correct order.' },
      { name: 'Handle failures', description: 'Retry failed steps according to policy and alert owners.' },
      { name: 'Save output', description: 'Store final workflow output in the selected destination.' }
    ],
    integrations: String(payload.integrations || 'Google Sheets, Gmail, Slack, HubSpot').split(',').map((item) => item.trim()),
    conditions: [
      'Only continue if required lead fields are present.',
      'Send to manual review if confidence score is below threshold.',
      'Skip outreach if prospect is already in CRM.'
    ],
    approvalFlow: payload.approvalRequired || 'Manual review before final action',
    retryPolicy: payload.retryPolicy || 'Retry 3 times with 5 min delay',
    schedule: payload.schedule || 'Instant trigger',
    webhookPayload: {
      workflowType: payload.workflowType,
      industry: payload.industry,
      lead: {
        name: 'Sample Lead',
        title: 'Head of Growth',
        company: 'Example SaaS',
        linkedinUrl: 'https://linkedin.com/in/sample'
      }
    },
    securityChecks: [
      'Do not expose API keys in frontend code.',
      'Use manual approval before LinkedIn outreach.',
      'Respect LinkedIn platform rules and anti-spam limits.'
    ],
    monitoring: [
      'Track generated leads per run.',
      'Track approval rate and failed integration calls.',
      'Alert owner if retry attempts are exhausted.'
    ],
    errorHandling: [
      'Retry temporary API failures.',
      'Log failed records with reason.',
      'Continue processing remaining leads when one lead fails.'
    ],
    testCases: [
      { title: 'Valid lead input', expectedResult: 'Lead is scored and added to CRM review queue.' },
      { title: 'Missing LinkedIn URL', expectedResult: 'Lead is routed to manual enrichment.' },
      { title: 'Low score lead', expectedResult: 'Lead is stored but outreach is not drafted.' }
    ],
    deploymentChecklist: [
      'Add production API keys in hosting dashboard.',
      'Test with sample payload.',
      'Confirm CRM and notification destinations.',
      'Enable monitoring alerts.'
    ],
    estimatedRuntime: '30-90 seconds per batch',
    automationScore: '82/100',
    yamlPreview: `workflow: ${title}\ntrigger: ${payload.trigger || 'Manual run'}\nmode: fallback\nsteps:\n  - define_icp\n  - find_prospects\n  - score_leads\n  - create_crm_record\n  - draft_outreach\n  - notify_team`
  };
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
    const message = error.message || 'Failed to generate workflow.';
    if (message.includes('429') || message.toLowerCase().includes('quota') || message.toLowerCase().includes('too many requests')) {
      return res.json(buildFallbackWorkflow(req.body, 'Gemini quota was exceeded.'));
    }

    res.status(500).json({ error: message });
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

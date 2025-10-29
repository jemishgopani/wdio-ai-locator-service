import { log, logInfo, logError } from '../utils/logger';
import axios from 'axios';
import { UsageCache, UsageEntry } from '../utils/usageCache';

export interface LLMResponse {
  selector: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMClient {
  generateLocator(
    dom: string,
    description: string,
    url?: string,
    requestTemplate?: boolean
  ): Promise<LLMResponse>;
}

export class OpenAIClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private apiUrl: string;
  private usageCache: UsageCache;
  private readonly aiClientName: string = 'OpenAI';

  constructor(
    apiKey: string,
    model: string = 'gpt-4o-mini',
    enableUsageTracking: boolean = false,
    usageCachePath?: string,
    baseUrl?: string
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.apiUrl = baseUrl || 'https://api.openai.com/v1/chat/completions';
    this.usageCache = new UsageCache(this.aiClientName, enableUsageTracking, usageCachePath);
    log('OpenAIClient initialized with model:', model);
    log('OpenAIClient API URL:', this.apiUrl);

    if (enableUsageTracking) {
      logInfo('AI usage tracking ENABLED at:', this.usageCache.getFilePath());
    } else {
      log('AI usage tracking DISABLED');
    }
  }

  getUsageSummary() {
    return this.usageCache.getSummary();
  }

  getUsageCachePath() {
    return this.usageCache.getFilePath();
  }

  isUsageTrackingEnabled(): boolean {
    return this.usageCache.isEnabled();
  }

  /**
   * Generate fallback selectors when AI fails
   */
  private generateFallbackSelectors(description: string): string[] {
    const selectors: string[] = [];
    const desc = description.toLowerCase();

    // Extract quoted text if present (e.g., 'find text "Powered by"' -> 'Powered by')
    const quotedMatch = description.match(/"([^"]+)"/);
    const searchText = quotedMatch ? quotedMatch[1] : description;
    const escapedText = searchText.replace(/'/g, "\\'");

    // Strategy 1: Text contains (most generic)
    selectors.push(`//*[contains(normalize-space(.), '${escapedText}')]`);

    // Strategy 2: Text exact match
    selectors.push(`//*[normalize-space(.)='${escapedText}']`);

    // Strategy 3: Element-specific based on keywords
    if (desc.includes('button') || desc.includes('btn')) {
      selectors.push(`//button[contains(normalize-space(.), '${escapedText}')]`);
      selectors.push(`//*[@role='button'][contains(normalize-space(.), '${escapedText}')]`);
    }

    if (desc.includes('link')) {
      selectors.push(`//a[contains(normalize-space(.), '${escapedText}')]`);
    }

    if (desc.includes('input') || desc.includes('field')) {
      selectors.push(`//input[@placeholder='${escapedText}']`);
      selectors.push(`//label[contains(., '${escapedText}')]//following-sibling::input`);
    }

    // Strategy 4: By ID or class (if description looks like an identifier)
    if (/^[a-zA-Z0-9_-]+$/.test(searchText)) {
      selectors.push(`#${searchText}`);
      selectors.push(`[data-testid="${searchText}"]`);
      selectors.push(`//*[@id='${searchText}']`);
    }

    // Remove duplicates and return
    return Array.from(new Set(selectors));
  }

  async generateLocator(
    dom: string,
    description: string,
    url: string = 'unknown-url',
    requestTemplate: boolean = false
  ): Promise<LLMResponse> {
    log('=== AI Locator Generation Started ===');
    log('Description:', description);
    log('URL:', url);
    log('Model:', this.model);
    log('DOM length:', dom.length, 'characters');
    log('Request template:', requestTemplate);

    const templateInstructions = requestTemplate
      ? `

# TEMPLATE LOCATORS
CRITICAL: The description contains template variables (e.g., {userName}, {itemId}, {username}).
You MUST generate locator PATTERNS with these placeholders preserved in the selectors.

## Rules for Template Variables:
1. **Identify the variable** in the description (text in curly braces: {variableName})
2. **Find how the variable appears in the DOM** (in text content, attributes, data-*, aria-*, etc.)
3. **Include the {variable} placeholder** in your selector exactly as it appears in the description
4. **DO NOT replace** {variable} with actual values from the DOM
5. The locator should work for ANY value when the placeholder is replaced

## Examples:

### Example 1: Variable in attribute
Description: "Edit button for {userName}"
DOM: <button data-user="john" aria-label="Edit john">Edit</button>
Response:
{
  "best": "button[data-user='{userName}']",
  "alternates": [
    "//button[@data-user='{userName}']",
    "button[aria-label*='{userName}']",
    "//button[contains(@aria-label, '{userName}')]"
  ]
}

### Example 2: Variable in text content
Description: "Status badge showing {status}"
DOM: <span class="badge">Active</span>
Response:
{
  "best": "span.badge:contains('{status}')",
  "alternates": [
    "//span[@class='badge'][contains(., '{status}')]",
    ".badge:has-text('{status}')",
    "//span[contains(text(), '{status}')]"
  ]
}

### Example 3: Variable in contextual element
Description: "Profile section for {username}"
DOM: <div data-testid="profile" data-username="ava-souza">...</div>
Response:
{
  "best": "div[data-testid='profile'][data-username='{username}']",
  "alternates": [
    "//div[@data-testid='profile'][@data-username='{username}']",
    "[data-username='{username}'][data-testid='profile']",
    "//div[@data-username='{username}']"
  ]
}

### Example 4: Contextual description (variable NOT in element)
Description: "Right sidebar container for {username}"
DOM: <div class="sidebar-right" data-testid="sidebar">...</div>
Note: If variable is NOT present in the element's attributes or text, use stable selectors without the variable:
{
  "best": "div[data-testid='sidebar'].sidebar-right",
  "alternates": [
    "//div[@data-testid='sidebar'][contains(@class, 'sidebar-right')]",
    ".sidebar-right[data-testid='sidebar']"
  ]
}

## Key Point:
ONLY include {variable} in the selector IF you can find it in the element's:
- Attributes (id, class, data-*, aria-*, name, etc.)
- Text content
- Child element text/attributes that reference the variable

If the variable is purely contextual (describes the page state, not the element), generate stable selectors without it.`
      : '';

    const systemPrompt = `You are an expert at finding elements in HTML and generating precise, stable selectors for web automation.${templateInstructions}

# YOUR TASK
Analyze the provided HTML DOM and find the element that matches the user's description. Return multiple selector options as JSON.

# CRITICAL OUTPUT FORMAT
You MUST return valid JSON in this exact format:
{
  "best": "your best selector here",
  "alternates": ["alternate1", "alternate2", "alternate3"]
}

# STEP-BY-STEP APPROACH
1. READ the user's description carefully - what are they looking for?
2. SEARCH the provided DOM for matching elements
3. IDENTIFY the element's unique characteristics (id, class, text, attributes)
4. GENERATE 3-4 different selectors from most stable to least stable
5. RETURN as JSON with "best" and "alternates" array

# SELECTOR PRIORITY (Use in this order)
1. data-testid, data-test, data-qa → [data-testid="value"]
2. Unique semantic ID → #login-button
3. ARIA attributes → [aria-label="Submit"]
4. Name attribute → [name="username"]
5. Unique class → .submit-button
6. Element + text → //button[contains(., "Submit")]
7. Combined attributes → button[type="submit"][class*="primary"]

# CSS SELECTOR PATTERNS
✓ GOOD:
  - #username
  - [data-testid="login-btn"]
  - button[type="submit"]
  - input[name="email"]
  - [aria-label="Close dialog"]

✗ AVOID:
  - #root-abc123 (generated ID)
  - .class1.class2.class3.class4 (too specific)
  - body > div > div > span (fragile structure)

# XPATH PATTERNS (When CSS won't work)
✓ GOOD:
  - //button[contains(., "Login")]
  - //input[@placeholder="Email"]
  - //*[contains(normalize-space(.), "Powered by")]
  - //a[contains(@href, "/login")]
  - //*[@role="button"][contains(., "Submit")]
  - //label[contains(., "Username")]//following-sibling::input

✗ AVOID:
  - /html/body/div[1]/div[2]/button (absolute path)
  - //div[1]//span[2] (positional predicates)
  - //div[@style="color: red"] (inline styles)

# TEXT MATCHING RULES
When description mentions finding TEXT (e.g., "find Powered by text"):
1. Look for ANY element containing that text
2. Use: //*[contains(normalize-space(.), "exact text")]
3. Or: //div[contains(., "text")] for specific element type
4. Or: //a[contains(., "text")] for links

# IMPORTANT XPATH FUNCTIONS
- normalize-space(.) → Handles whitespace: //button[normalize-space(.)="Login"]
- contains() → Partial match: //*[contains(@class, "btn")]
- text() → Direct text: //*[text()="exact"]
- translate() → Case insensitive: //button[contains(translate(., 'ABC', 'abc'), 'login')]

# REAL EXAMPLES

Example 1 - Find by text:
DOM: <div>Powered by <a href="...">Selenium</a></div>
Task: "find Powered by text"
Response:
{
  "best": "//*[contains(normalize-space(.), 'Powered by')]",
  "alternates": [
    "//*[contains(text(), 'Powered by')]",
    "//div[contains(., 'Powered by')]"
  ]
}

Example 2 - Find button:
DOM: <button id="submit" type="submit" class="btn-primary">Login</button>
Task: "login button"
Response:
{
  "best": "#submit",
  "alternates": [
    "button[type='submit']",
    "//button[contains(., 'Login')]",
    ".btn-primary"
  ]
}

Example 3 - Find input:
DOM: <input name="username" id="user" placeholder="Enter username">
Task: "username input"
Response:
{
  "best": "#user",
  "alternates": [
    "input[name='username']",
    "//input[@placeholder='Enter username']"
  ]
}

# REMEMBER
- Return ONLY valid JSON, no explanation
- Provide 3-4 alternates for fallback
- Test selectors mentally against the DOM
- Prioritize stability over brevity`;

    const userPrompt = `# HTML DOM
${dom}

# TASK
${description}

# INSTRUCTIONS
1. Carefully examine the HTML DOM above
2. Find the element(s) that match the task description
3. Generate 4 different selectors (from most stable to least stable)
4. Return ONLY valid JSON (no markdown, no explanation)

# OUTPUT FORMAT
{
  "best": "most stable selector",
  "alternates": ["alternate1", "alternate2", "alternate3"]
}

Note: If task mentions "text" or "contains", look for elements with that text content.`;
    const startTime = Date.now();

    try {
      log('=== Preparing OpenAI API Request ===');
      log('API URL:', this.apiUrl);
      log('Model:', this.model);
      log('API Key present:', !!this.apiKey);
      log('API Key length:', this.apiKey?.length || 0);
      log('System prompt length:', systemPrompt.length);
      log('User prompt length:', userPrompt.length);
      log('Sending request to OpenAI API...');

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 500
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`
          }
        }
      );

      const duration = Date.now() - startTime;
      const rawContent = response.data.choices[0].message.content.trim();
      const usage = response.data.usage;

      log('✓ OpenAI API call successful');
      log('Raw response:', rawContent);
      log('Response time:', duration, 'ms');
      log('Token usage:', {
        prompt: usage?.prompt_tokens || 0,
        completion: usage?.completion_tokens || 0,
        total: usage?.total_tokens || 0
      });

      // Parse JSON response
      let generatedLocator = rawContent;
      let parsedResponse: { best: string; alternates?: string[] } | null = null;

      try {
        // Try to parse as JSON
        const cleaned = rawContent
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        parsedResponse = JSON.parse(cleaned);
        if (parsedResponse && parsedResponse.best) {
          generatedLocator = parsedResponse.best;
          log('Parsed JSON response:', parsedResponse);
        } else {
          log('Invalid JSON structure, using raw response');
          generatedLocator = rawContent;
          parsedResponse = null;
        }
      } catch (_error) {
        log('Failed to parse JSON, using raw response as selector');
        // Fallback: use raw response as selector
        generatedLocator = rawContent;
        parsedResponse = null;
      }

      // Build selector string with alternates
      let selectorWithAlternates = generatedLocator;
      if (parsedResponse && parsedResponse.alternates && parsedResponse.alternates.length > 0) {
        // Format: best|||alternate1|||alternate2
        selectorWithAlternates = [parsedResponse.best, ...parsedResponse.alternates].join('|||');
        log('Formatted selector with alternates:', selectorWithAlternates);
      }

      // Log usage to cache
      const usageEntry: UsageEntry = {
        timestamp: new Date().toISOString(),
        aiClient: this.aiClientName,
        model: this.model,
        description,
        url,
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        success: true,
        selector: generatedLocator
      };

      this.usageCache.addUsage(usageEntry);
      log('=== AI Locator Generation Completed ===');

      return {
        selector: selectorWithAlternates,
        usage: this.usageCache.isEnabled()
          ? {
              promptTokens: usage?.prompt_tokens || 0,
              completionTokens: usage?.completion_tokens || 0,
              totalTokens: usage?.total_tokens || 0
            }
          : undefined
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logError('=== OpenAI API Error ===');
      logError('Error type:', error.constructor.name);
      logError('Error message:', error.message);
      logError('Error code:', error.code);
      log('Response time:', duration, 'ms');

      if (error.response) {
        logError('Response status:', error.response.status);
        logError('Response status text:', error.response.statusText);
        logError('OpenAI API error response:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        logError('No response received from OpenAI API');
        logError('Request details:', error.request);
      } else {
        logError('Error setting up request:', error.message);
      }

      // Log failed usage to cache
      const usageEntry: UsageEntry = {
        timestamp: new Date().toISOString(),
        aiClient: this.aiClientName,
        model: this.model,
        description,
        url,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        success: false,
        error: error.message
      };

      this.usageCache.addUsage(usageEntry);
      log('=== AI Locator Generation Failed ===');

      // Generate multiple fallback selectors
      const fallbacks = this.generateFallbackSelectors(description);
      const fallbackString = fallbacks.join('|||');
      log('Using fallback selectors:', fallbacks);

      return {
        selector: fallbackString,
        usage: undefined
      };
    }
  }
}

export class OllamaClient implements LLMClient {
  private model: string;
  private apiUrl: string;
  private usageCache: UsageCache;
  private readonly aiClientName: string = 'Ollama';

  constructor(
    model: string = 'llama3',
    enableUsageTracking: boolean = false,
    usageCachePath?: string,
    baseUrl: string = 'http://localhost:11434'
  ) {
    this.model = model;
    this.apiUrl = `${baseUrl}/api/chat`;
    this.usageCache = new UsageCache(this.aiClientName, enableUsageTracking, usageCachePath);
    log('OllamaClient initialized with model:', model);
    log('OllamaClient API URL:', this.apiUrl);

    if (enableUsageTracking) {
      logInfo('AI usage tracking ENABLED at:', this.usageCache.getFilePath());
    } else {
      log('AI usage tracking DISABLED');
    }
  }

  getUsageSummary() {
    return this.usageCache.getSummary();
  }

  getUsageCachePath() {
    return this.usageCache.getFilePath();
  }

  isUsageTrackingEnabled(): boolean {
    return this.usageCache.isEnabled();
  }

  /**
   * Generate fallback selectors when AI fails
   */
  private generateFallbackSelectors(description: string): string[] {
    const selectors: string[] = [];
    const desc = description.toLowerCase();

    const quotedMatch = description.match(/"([^"]+)"/);
    const searchText = quotedMatch ? quotedMatch[1] : description;
    const escapedText = searchText.replace(/'/g, "\\'");

    selectors.push(`//*[contains(normalize-space(.), '${escapedText}')]`);
    selectors.push(`//*[normalize-space(.)='${escapedText}']`);

    if (desc.includes('button') || desc.includes('btn')) {
      selectors.push(`//button[contains(normalize-space(.), '${escapedText}')]`);
      selectors.push(`//*[@role='button'][contains(normalize-space(.), '${escapedText}')]`);
    }

    if (desc.includes('link')) {
      selectors.push(`//a[contains(normalize-space(.), '${escapedText}')]`);
    }

    if (desc.includes('input') || desc.includes('field')) {
      selectors.push(`//input[@placeholder='${escapedText}']`);
      selectors.push(`//label[contains(., '${escapedText}')]//following-sibling::input`);
    }

    if (/^[a-zA-Z0-9_-]+$/.test(searchText)) {
      selectors.push(`#${searchText}`);
      selectors.push(`[data-testid="${searchText}"]`);
      selectors.push(`//*[@id='${searchText}']`);
    }

    return Array.from(new Set(selectors));
  }

  async generateLocator(
    dom: string,
    description: string,
    url: string = 'unknown-url',
    requestTemplate: boolean = false
  ): Promise<LLMResponse> {
    log('=== AI Locator Generation Started (Ollama) ===');
    log('Description:', description);
    log('URL:', url);
    log('Model:', this.model);
    log('DOM length:', dom.length, 'characters');
    log('Request template:', requestTemplate);

    const templateInstructions = requestTemplate
      ? `

# TEMPLATE LOCATORS
CRITICAL: The description contains template variables (e.g., {userName}, {itemId}, {username}).
You MUST generate locator PATTERNS with these placeholders preserved in the selectors.

## Rules for Template Variables:
1. **Identify the variable** in the description (text in curly braces: {variableName})
2. **Find how the variable appears in the DOM** (in text content, attributes, data-*, aria-*, etc.)
3. **Include the {variable} placeholder** in your selector exactly as it appears in the description
4. **DO NOT replace** {variable} with actual values from the DOM
5. The locator should work for ANY value when the placeholder is replaced

## Examples:

### Example 1: Variable in attribute
Description: "Edit button for {userName}"
DOM: <button data-user="john" aria-label="Edit john">Edit</button>
Response:
{
  "best": "button[data-user='{userName}']",
  "alternates": [
    "//button[@data-user='{userName}']",
    "button[aria-label*='{userName}']",
    "//button[contains(@aria-label, '{userName}')]"
  ]
}

### Example 2: Variable in text content
Description: "Status badge showing {status}"
DOM: <span class="badge">Active</span>
Response:
{
  "best": "span.badge:contains('{status}')",
  "alternates": [
    "//span[@class='badge'][contains(., '{status}')]",
    ".badge:has-text('{status}')",
    "//span[contains(text(), '{status}')]"
  ]
}

### Example 3: Variable in contextual element
Description: "Profile section for {username}"
DOM: <div data-testid="profile" data-username="ava-souza">...</div>
Response:
{
  "best": "div[data-testid='profile'][data-username='{username}']",
  "alternates": [
    "//div[@data-testid='profile'][@data-username='{username}']",
    "[data-username='{username}'][data-testid='profile']",
    "//div[@data-username='{username}']"
  ]
}

### Example 4: Contextual description (variable NOT in element)
Description: "Right sidebar container for {username}"
DOM: <div class="sidebar-right" data-testid="sidebar">...</div>
Note: If variable is NOT present in the element's attributes or text, use stable selectors without the variable:
{
  "best": "div[data-testid='sidebar'].sidebar-right",
  "alternates": [
    "//div[@data-testid='sidebar'][contains(@class, 'sidebar-right')]",
    ".sidebar-right[data-testid='sidebar']"
  ]
}

## Key Point:
ONLY include {variable} in the selector IF you can find it in the element's:
- Attributes (id, class, data-*, aria-*, name, etc.)
- Text content
- Child element text/attributes that reference the variable

If the variable is purely contextual (describes the page state, not the element), generate stable selectors without it.`
      : '';

    const systemPrompt = `You are an expert at finding elements in HTML and generating precise, stable selectors for web automation.${templateInstructions}

# YOUR TASK
Analyze the provided HTML DOM and find the element that matches the user's description. Return multiple selector options as JSON.

# CRITICAL OUTPUT FORMAT
You MUST return valid JSON in this exact format:
{
  "best": "your best selector here",
  "alternates": ["alternate1", "alternate2", "alternate3"]
}

# STEP-BY-STEP APPROACH
1. READ the user's description carefully - what are they looking for?
2. SEARCH the provided DOM for matching elements
3. IDENTIFY the element's unique characteristics (id, class, text, attributes)
4. GENERATE 3-4 different selectors from most stable to least stable
5. RETURN as JSON with "best" and "alternates" array

# SELECTOR PRIORITY (Use in this order)
1. data-testid, data-test, data-qa → [data-testid="value"]
2. Unique semantic ID → #login-button
3. ARIA attributes → [aria-label="Submit"]
4. Name attribute → [name="username"]
5. Unique class → .submit-button
6. Element + text → //button[contains(., "Submit")]
7. Combined attributes → button[type="submit"][class*="primary"]

# CSS SELECTOR PATTERNS
✓ GOOD:
  - #username
  - [data-testid="login-btn"]
  - button[type="submit"]
  - input[name="email"]
  - [aria-label="Close dialog"]

✗ AVOID:
  - #root-abc123 (generated ID)
  - .class1.class2.class3.class4 (too specific)
  - body > div > div > span (fragile structure)

# XPATH PATTERNS (When CSS won't work)
✓ GOOD:
  - //button[contains(., "Login")]
  - //input[@placeholder="Email"]
  - //*[contains(normalize-space(.), "Powered by")]
  - //a[contains(@href, "/login")]
  - //*[@role="button"][contains(., "Submit")]
  - //label[contains(., "Username")]//following-sibling::input

✗ AVOID:
  - /html/body/div[1]/div[2]/button (absolute path)
  - //div[1]//span[2] (positional predicates)
  - //div[@style="color: red"] (inline styles)

# TEXT MATCHING RULES
When description mentions finding TEXT (e.g., "find Powered by text"):
1. Look for ANY element containing that text
2. Use: //*[contains(normalize-space(.), "exact text")]
3. Or: //div[contains(., "text")] for specific element type
4. Or: //a[contains(., "text")] for links

# IMPORTANT XPATH FUNCTIONS
- normalize-space(.) → Handles whitespace: //button[normalize-space(.)="Login"]
- contains() → Partial match: //*[contains(@class, "btn")]
- text() → Direct text: //*[text()="exact"]
- translate() → Case insensitive: //button[contains(translate(., 'ABC', 'abc'), 'login')]

# REAL EXAMPLES

Example 1 - Find by text:
DOM: <div>Powered by <a href="...">Selenium</a></div>
Task: "find Powered by text"
Response:
{
  "best": "//*[contains(normalize-space(.), 'Powered by')]",
  "alternates": [
    "//*[contains(text(), 'Powered by')]",
    "//div[contains(., 'Powered by')]"
  ]
}

Example 2 - Find button:
DOM: <button id="submit" type="submit" class="btn-primary">Login</button>
Task: "login button"
Response:
{
  "best": "#submit",
  "alternates": [
    "button[type='submit']",
    "//button[contains(., 'Login')]",
    ".btn-primary"
  ]
}

Example 3 - Find input:
DOM: <input name="username" id="user" placeholder="Enter username">
Task: "username input"
Response:
{
  "best": "#user",
  "alternates": [
    "input[name='username']",
    "//input[@placeholder='Enter username']"
  ]
}

# REMEMBER
- Return ONLY valid JSON, no explanation
- Provide 3-4 alternates for fallback
- Test selectors mentally against the DOM
- Prioritize stability over brevity`;

    const userPrompt = `# HTML DOM
${dom}

# TASK
${description}

# INSTRUCTIONS
1. Carefully examine the HTML DOM above
2. Find the element(s) that match the task description
3. Generate 4 different selectors (from most stable to least stable)
4. Return ONLY valid JSON (no markdown, no explanation)

# OUTPUT FORMAT
{
  "best": "most stable selector",
  "alternates": ["alternate1", "alternate2", "alternate3"]
}

Note: If task mentions "text" or "contains", look for elements with that text content.`;
    const startTime = Date.now();

    try {
      log('=== Preparing Ollama API Request ===');
      log('API URL:', this.apiUrl);
      log('Model:', this.model);
      log('System prompt length:', systemPrompt.length);
      log('User prompt length:', userPrompt.length);
      log('Sending request to Ollama API...');

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 500
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const duration = Date.now() - startTime;
      const rawContent = response.data.message.content.trim();

      log('✓ Ollama API call successful');
      log('Raw response:', rawContent);
      log('Response time:', duration, 'ms');

      // Parse JSON response
      let generatedLocator = rawContent;
      let parsedResponse: { best: string; alternates?: string[] } | null = null;

      try {
        const cleaned = rawContent
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        parsedResponse = JSON.parse(cleaned);
        if (parsedResponse && parsedResponse.best) {
          generatedLocator = parsedResponse.best;
          log('Parsed JSON response:', parsedResponse);
        } else {
          log('Invalid JSON structure, using raw response');
          generatedLocator = rawContent;
          parsedResponse = null;
        }
      } catch (_error) {
        log('Failed to parse JSON, using raw response as selector');
        generatedLocator = rawContent;
        parsedResponse = null;
      }

      // Build selector string with alternates
      let selectorWithAlternates = generatedLocator;
      if (parsedResponse && parsedResponse.alternates && parsedResponse.alternates.length > 0) {
        selectorWithAlternates = [parsedResponse.best, ...parsedResponse.alternates].join('|||');
        log('Formatted selector with alternates:', selectorWithAlternates);
      }

      // Log usage to cache (Ollama doesn't provide token counts)
      const usageEntry: UsageEntry = {
        timestamp: new Date().toISOString(),
        aiClient: this.aiClientName,
        model: this.model,
        description,
        url,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        success: true,
        selector: generatedLocator
      };

      this.usageCache.addUsage(usageEntry);
      log('=== AI Locator Generation Completed ===');

      return {
        selector: selectorWithAlternates,
        usage: undefined
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logError('=== Ollama API Error ===');
      logError('Error type:', error.constructor.name);
      logError('Error message:', error.message);
      logError('Error code:', error.code);
      log('Response time:', duration, 'ms');

      if (error.response) {
        logError('Response status:', error.response.status);
        logError('Response status text:', error.response.statusText);
        logError('Ollama API error response:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        logError('No response received from Ollama API');
        logError('Request details:', error.request);
      } else {
        logError('Error setting up request:', error.message);
      }

      // Log failed usage to cache
      const usageEntry: UsageEntry = {
        timestamp: new Date().toISOString(),
        aiClient: this.aiClientName,
        model: this.model,
        description,
        url,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        success: false,
        error: error.message
      };

      this.usageCache.addUsage(usageEntry);
      log('=== AI Locator Generation Failed ===');

      const fallbacks = this.generateFallbackSelectors(description);
      const fallbackString = fallbacks.join('|||');
      log('Using fallback selectors:', fallbacks);

      return {
        selector: fallbackString,
        usage: undefined
      };
    }
  }
}

export class OpenAIRouterClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private apiUrl: string;
  private usageCache: UsageCache;
  private readonly aiClientName: string = 'OpenAI-Router';

  constructor(
    apiKey: string,
    model: string = 'gpt-4o-mini',
    enableUsageTracking: boolean = false,
    usageCachePath?: string,
    baseUrl: string = 'https://openrouter.ai/api/v1/chat/completions'
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.apiUrl = baseUrl;
    this.usageCache = new UsageCache(this.aiClientName, enableUsageTracking, usageCachePath);
    log('OpenAIRouterClient initialized with model:', model);
    log('OpenAIRouterClient API URL:', this.apiUrl);

    if (enableUsageTracking) {
      logInfo('AI usage tracking ENABLED at:', this.usageCache.getFilePath());
    } else {
      log('AI usage tracking DISABLED');
    }
  }

  getUsageSummary() {
    return this.usageCache.getSummary();
  }

  getUsageCachePath() {
    return this.usageCache.getFilePath();
  }

  isUsageTrackingEnabled(): boolean {
    return this.usageCache.isEnabled();
  }

  /**
   * Generate fallback selectors when AI fails
   */
  private generateFallbackSelectors(description: string): string[] {
    const selectors: string[] = [];
    const desc = description.toLowerCase();

    const quotedMatch = description.match(/"([^"]+)"/);
    const searchText = quotedMatch ? quotedMatch[1] : description;
    const escapedText = searchText.replace(/'/g, "\\'");

    selectors.push(`//*[contains(normalize-space(.), '${escapedText}')]`);
    selectors.push(`//*[normalize-space(.)='${escapedText}']`);

    if (desc.includes('button') || desc.includes('btn')) {
      selectors.push(`//button[contains(normalize-space(.), '${escapedText}')]`);
      selectors.push(`//*[@role='button'][contains(normalize-space(.), '${escapedText}')]`);
    }

    if (desc.includes('link')) {
      selectors.push(`//a[contains(normalize-space(.), '${escapedText}')]`);
    }

    if (desc.includes('input') || desc.includes('field')) {
      selectors.push(`//input[@placeholder='${escapedText}']`);
      selectors.push(`//label[contains(., '${escapedText}')]//following-sibling::input`);
    }

    if (/^[a-zA-Z0-9_-]+$/.test(searchText)) {
      selectors.push(`#${searchText}`);
      selectors.push(`[data-testid="${searchText}"]`);
      selectors.push(`//*[@id='${searchText}']`);
    }

    return Array.from(new Set(selectors));
  }

  async generateLocator(
    dom: string,
    description: string,
    url: string = 'unknown-url',
    requestTemplate: boolean = false
  ): Promise<LLMResponse> {
    log('=== AI Locator Generation Started (OpenAI Router) ===');
    log('Description:', description);
    log('URL:', url);
    log('Model:', this.model);
    log('DOM length:', dom.length, 'characters');
    log('Request template:', requestTemplate);

    const templateInstructions = requestTemplate
      ? `

# TEMPLATE LOCATORS
CRITICAL: The description contains template variables (e.g., {userName}, {itemId}, {username}).
You MUST generate locator PATTERNS with these placeholders preserved in the selectors.

## Rules for Template Variables:
1. **Identify the variable** in the description (text in curly braces: {variableName})
2. **Find how the variable appears in the DOM** (in text content, attributes, data-*, aria-*, etc.)
3. **Include the {variable} placeholder** in your selector exactly as it appears in the description
4. **DO NOT replace** {variable} with actual values from the DOM
5. The locator should work for ANY value when the placeholder is replaced

## Examples:

### Example 1: Variable in attribute
Description: "Edit button for {userName}"
DOM: <button data-user="john" aria-label="Edit john">Edit</button>
Response:
{
  "best": "button[data-user='{userName}']",
  "alternates": [
    "//button[@data-user='{userName}']",
    "button[aria-label*='{userName}']",
    "//button[contains(@aria-label, '{userName}')]"
  ]
}

### Example 2: Variable in text content
Description: "Status badge showing {status}"
DOM: <span class="badge">Active</span>
Response:
{
  "best": "span.badge:contains('{status}')",
  "alternates": [
    "//span[@class='badge'][contains(., '{status}')]",
    ".badge:has-text('{status}')",
    "//span[contains(text(), '{status}')]"
  ]
}

### Example 3: Variable in contextual element
Description: "Profile section for {username}"
DOM: <div data-testid="profile" data-username="ava-souza">...</div>
Response:
{
  "best": "div[data-testid='profile'][data-username='{username}']",
  "alternates": [
    "//div[@data-testid='profile'][@data-username='{username}']",
    "[data-username='{username}'][data-testid='profile']",
    "//div[@data-username='{username}']"
  ]
}

### Example 4: Contextual description (variable NOT in element)
Description: "Right sidebar container for {username}"
DOM: <div class="sidebar-right" data-testid="sidebar">...</div>
Note: If variable is NOT present in the element's attributes or text, use stable selectors without the variable:
{
  "best": "div[data-testid='sidebar'].sidebar-right",
  "alternates": [
    "//div[@data-testid='sidebar'][contains(@class, 'sidebar-right')]",
    ".sidebar-right[data-testid='sidebar']"
  ]
}

## Key Point:
ONLY include {variable} in the selector IF you can find it in the element's:
- Attributes (id, class, data-*, aria-*, name, etc.)
- Text content
- Child element text/attributes that reference the variable

If the variable is purely contextual (describes the page state, not the element), generate stable selectors without it.`
      : '';

    const systemPrompt = `You are an expert at finding elements in HTML and generating precise, stable selectors for web automation.${templateInstructions}

# YOUR TASK
Analyze the provided HTML DOM and find the element that matches the user's description. Return multiple selector options as JSON.

# CRITICAL OUTPUT FORMAT
You MUST return valid JSON in this exact format:
{
  "best": "your best selector here",
  "alternates": ["alternate1", "alternate2", "alternate3"]
}

# STEP-BY-STEP APPROACH
1. READ the user's description carefully - what are they looking for?
2. SEARCH the provided DOM for matching elements
3. IDENTIFY the element's unique characteristics (id, class, text, attributes)
4. GENERATE 3-4 different selectors from most stable to least stable
5. RETURN as JSON with "best" and "alternates" array

# SELECTOR PRIORITY (Use in this order)
1. data-testid, data-test, data-qa → [data-testid="value"]
2. Unique semantic ID → #login-button
3. ARIA attributes → [aria-label="Submit"]
4. Name attribute → [name="username"]
5. Unique class → .submit-button
6. Element + text → //button[contains(., "Submit")]
7. Combined attributes → button[type="submit"][class*="primary"]

# CSS SELECTOR PATTERNS
✓ GOOD:
  - #username
  - [data-testid="login-btn"]
  - button[type="submit"]
  - input[name="email"]
  - [aria-label="Close dialog"]

✗ AVOID:
  - #root-abc123 (generated ID)
  - .class1.class2.class3.class4 (too specific)
  - body > div > div > span (fragile structure)

# XPATH PATTERNS (When CSS won't work)
✓ GOOD:
  - //button[contains(., "Login")]
  - //input[@placeholder="Email"]
  - //*[contains(normalize-space(.), "Powered by")]
  - //a[contains(@href, "/login")]
  - //*[@role="button"][contains(., "Submit")]
  - //label[contains(., "Username")]//following-sibling::input

✗ AVOID:
  - /html/body/div[1]/div[2]/button (absolute path)
  - //div[1]//span[2] (positional predicates)
  - //div[@style="color: red"] (inline styles)

# TEXT MATCHING RULES
When description mentions finding TEXT (e.g., "find Powered by text"):
1. Look for ANY element containing that text
2. Use: //*[contains(normalize-space(.), "exact text")]
3. Or: //div[contains(., "text")] for specific element type
4. Or: //a[contains(., "text")] for links

# IMPORTANT XPATH FUNCTIONS
- normalize-space(.) → Handles whitespace: //button[normalize-space(.)="Login"]
- contains() → Partial match: //*[contains(@class, "btn")]
- text() → Direct text: //*[text()="exact"]
- translate() → Case insensitive: //button[contains(translate(., 'ABC', 'abc'), 'login')]

# REAL EXAMPLES

Example 1 - Find by text:
DOM: <div>Powered by <a href="...">Selenium</a></div>
Task: "find Powered by text"
Response:
{
  "best": "//*[contains(normalize-space(.), 'Powered by')]",
  "alternates": [
    "//*[contains(text(), 'Powered by')]",
    "//div[contains(., 'Powered by')]"
  ]
}

Example 2 - Find button:
DOM: <button id="submit" type="submit" class="btn-primary">Login</button>
Task: "login button"
Response:
{
  "best": "#submit",
  "alternates": [
    "button[type='submit']",
    "//button[contains(., 'Login')]",
    ".btn-primary"
  ]
}

Example 3 - Find input:
DOM: <input name="username" id="user" placeholder="Enter username">
Task: "username input"
Response:
{
  "best": "#user",
  "alternates": [
    "input[name='username']",
    "//input[@placeholder='Enter username']"
  ]
}

# REMEMBER
- Return ONLY valid JSON, no explanation
- Provide 3-4 alternates for fallback
- Test selectors mentally against the DOM
- Prioritize stability over brevity`;

    const userPrompt = `# HTML DOM
${dom}

# TASK
${description}

# INSTRUCTIONS
1. Carefully examine the HTML DOM above
2. Find the element(s) that match the task description
3. Generate 4 different selectors (from most stable to least stable)
4. Return ONLY valid JSON (no markdown, no explanation)

# OUTPUT FORMAT
{
  "best": "most stable selector",
  "alternates": ["alternate1", "alternate2", "alternate3"]
}

Note: If task mentions "text" or "contains", look for elements with that text content.`;
    const startTime = Date.now();

    try {
      log('=== Preparing OpenAI Router API Request ===');
      log('API URL:', this.apiUrl);
      log('Model:', this.model);
      log('API Key present:', !!this.apiKey);
      log('API Key length:', this.apiKey?.length || 0);
      log('System prompt length:', systemPrompt.length);
      log('User prompt length:', userPrompt.length);
      log('Sending request to OpenAI Router API...');

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 500
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://github.com/wdio-ai-locator-service',
            'X-Title': 'WDIO AI Locator Service'
          }
        }
      );

      const duration = Date.now() - startTime;
      const rawContent = response.data.choices[0].message.content.trim();
      const usage = response.data.usage;

      log('✓ OpenAI Router API call successful');
      log('Raw response:', rawContent);
      log('Response time:', duration, 'ms');
      log('Token usage:', {
        prompt: usage?.prompt_tokens || 0,
        completion: usage?.completion_tokens || 0,
        total: usage?.total_tokens || 0
      });

      // Parse JSON response
      let generatedLocator = rawContent;
      let parsedResponse: { best: string; alternates?: string[] } | null = null;

      try {
        const cleaned = rawContent
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        parsedResponse = JSON.parse(cleaned);
        if (parsedResponse && parsedResponse.best) {
          generatedLocator = parsedResponse.best;
          log('Parsed JSON response:', parsedResponse);
        } else {
          log('Invalid JSON structure, using raw response');
          generatedLocator = rawContent;
          parsedResponse = null;
        }
      } catch (_error) {
        log('Failed to parse JSON, using raw response as selector');
        generatedLocator = rawContent;
        parsedResponse = null;
      }

      // Build selector string with alternates
      let selectorWithAlternates = generatedLocator;
      if (parsedResponse && parsedResponse.alternates && parsedResponse.alternates.length > 0) {
        selectorWithAlternates = [parsedResponse.best, ...parsedResponse.alternates].join('|||');
        log('Formatted selector with alternates:', selectorWithAlternates);
      }

      // Log usage to cache
      const usageEntry: UsageEntry = {
        timestamp: new Date().toISOString(),
        aiClient: this.aiClientName,
        model: this.model,
        description,
        url,
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        success: true,
        selector: generatedLocator
      };

      this.usageCache.addUsage(usageEntry);
      log('=== AI Locator Generation Completed ===');

      return {
        selector: selectorWithAlternates,
        usage: this.usageCache.isEnabled()
          ? {
              promptTokens: usage?.prompt_tokens || 0,
              completionTokens: usage?.completion_tokens || 0,
              totalTokens: usage?.total_tokens || 0
            }
          : undefined
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logError('=== OpenAI Router API Error ===');
      logError('Error type:', error.constructor.name);
      logError('Error message:', error.message);
      logError('Error code:', error.code);
      log('Response time:', duration, 'ms');

      if (error.response) {
        logError('Response status:', error.response.status);
        logError('Response status text:', error.response.statusText);
        logError('OpenAI Router API error response:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        logError('No response received from OpenAI Router API');
        logError('Request details:', error.request);
      } else {
        logError('Error setting up request:', error.message);
      }

      // Log failed usage to cache
      const usageEntry: UsageEntry = {
        timestamp: new Date().toISOString(),
        aiClient: this.aiClientName,
        model: this.model,
        description,
        url,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        success: false,
        error: error.message
      };

      this.usageCache.addUsage(usageEntry);
      log('=== AI Locator Generation Failed ===');

      const fallbacks = this.generateFallbackSelectors(description);
      const fallbackString = fallbacks.join('|||');
      log('Using fallback selectors:', fallbacks);

      return {
        selector: fallbackString,
        usage: undefined
      };
    }
  }
}

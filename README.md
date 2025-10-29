<div align="center">

# 🤖 WDIO AI Locator Service

**AI-Powered Element Location for WebdriverIO**

[![npm version](https://img.shields.io/npm/v/wdio-ai-locator-service.svg?style=flat-square&logo=npm&logoColor=white)](https://www.npmjs.com/package/wdio-ai-locator-service)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square&logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)
[![CI](https://img.shields.io/github/actions/workflow/status/jemishgopani/wdio-ai-locator-service/ci.yml?branch=main&style=flat-square&logo=githubactions&logoColor=white&label=CI)](https://github.com/jemishgopani/wdio-ai-locator-service/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![WebdriverIO](https://img.shields.io/badge/WebdriverIO-9.x-ea5906.svg?style=flat-square&logo=webdriverio&logoColor=white)](https://webdriver.io/)
[![Tests](https://img.shields.io/badge/Tests-Vitest-6E9F18.svg?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Test Coverage](https://img.shields.io/badge/Coverage-85%2B-brightgreen.svg?style=flat-square&logo=codecov&logoColor=white)](#-testing)

**Stop writing brittle CSS/XPath selectors. Let AI find your elements using natural language.**

[Getting Started](#-quick-start) • [Features](#-features) • [Examples](#-examples) • [API Reference](#-api-reference) • [Documentation](#-documentation)

</div>

---

## 📑 Table of Contents

- [🎯 Why This Service?](#-why-this-service)
- [✨ Features](#-features)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [🎨 Dynamic Locators & Template Variables](#-dynamic-locators--template-variables)
  - [Basic Template Usage](#basic-template-usage)
  - [Data-Driven Testing](#data-driven-testing-template-caching)
  - [Global Context](#global-context)
  - [Multiple Variables](#multiple-variables)
- [🔌 Multi-Provider Support](#-multi-provider-support)
  - [OpenAI](#openai-default)
  - [OpenAI Router](#openai-router)
  - [Ollama (Local)](#ollama-localself-hosted)
  - [Provider Comparison](#provider-comparison)
- [🎯 Configuration Options](#-configuration-options)
- [📖 API Reference](#-api-reference)
  - [browser.aiLocator()](#browserailocatordescription-options)
  - [Context Management](#global-context-management)
- [💡 Examples](#-examples)
  - [Basic Usage](#example-1-basic-usage)
  - [Data-Driven Testing](#example-2-data-driven-testing)
  - [Page Object Pattern](#example-3-page-object-pattern)
  - [E-Commerce Workflow](#example-4-e-commerce-workflow)
- [🎓 Best Practices](#-best-practices)
- [🔍 Auto-Heal Feature](#-auto-heal-feature)
- [📊 Usage Tracking](#-usage-tracking)
- [🛠️ Troubleshooting](#-troubleshooting)
- [🧪 Testing](#-testing)
- [📚 Documentation](#-documentation)
- [🤝 Contributing](#-contributing)
  - [Development Workflow](#development-workflow)
  - [GitHub Actions](#github-actions)
- [📦 Publishing](#-publishing)
- [📄 License](#-license)

---

## 🎯 Why This Service?

Traditional element selectors are fragile and hard to maintain. AI Locator Service revolutionizes web automation by:

```typescript
// ❌ Old way: Brittle selectors
await $('#root > div.container > div:nth-child(2) > button.primary').click();

// ✅ New way: Natural language
const locator = await browser.aiLocator('login button');
await $(locator).click();
```

### Key Benefits

| Feature                | Traditional Selectors        | AI Locator Service     |
| ---------------------- | ---------------------------- | ---------------------- |
| **Maintainability**    | Manual updates needed        | Self-healing locators  |
| **Readability**        | Complex XPath/CSS            | Plain English          |
| **Speed**              | Write & debug selectors      | Describe what you want |
| **Resilience**         | Breaks on DOM changes        | Adapts automatically   |
| **Team Collaboration** | Technical knowledge required | Anyone can write tests |

---

## ✨ Features

### 🚀 Core Features

- **🗣️ Natural Language** - Find elements using plain English descriptions
- **🔄 Self-Healing** - Auto-regenerates locators when UI changes
- **💾 Smart Caching** - Reduces AI calls by 99% with intelligent caching
- **🎯 Template Variables** - Reusable dynamic locators with `{variable}` syntax
- **⚡ Multi-Provider Support** - Works with OpenAI, OpenAI Router, and Ollama
- **📊 Usage Tracking** - Monitor AI API consumption and costs
- **🔁 Auto-Retry** - Multiple fallback strategies for maximum reliability

### 🎨 Advanced Features

- **Template Caching** - One AI call for unlimited variable combinations
- **Global Context** - Set variables once, use everywhere
- **Lazy Evaluation** - Dynamic variable resolution at runtime
- **Scoped Context** - Auto-cleanup variable contexts
- **Multiple Alternates** - AI generates 3-4 fallback selectors per request
- **DOM Validation** - Verifies element existence before returning locator

---

## 📦 Installation

```bash
npm install wdio-ai-locator-service --save-dev
```

---

## 🚀 Quick Start

### Step 1: Configure WDIO Service

Add the service to your `wdio.conf.ts`:

```typescript
// wdio.conf.ts
export const config = {
  // ... other config
  services: [
    [
      'ai-locator',
      {
        // or use full name: 'wdio-ai-locator-service'
        provider: 'openai', // 'openai' | 'openai-router' | 'ollama'
        apiKey: process.env.OPENAI_API_KEY, // Your API key
        model: 'gpt-4o-mini', // Model to use
        enableUsageTracking: true, // Optional: Track API usage
        cachePath: './.ai-locator-cache.json', // Optional: Cache file path
        maxRetries: 2 // Optional: Retry attempts
      }
    ]
  ]
};
```

### Step 2: Write Tests with Natural Language

```typescript
describe('Login Flow', () => {
  it('should login successfully', async () => {
    await browser.url('https://example.com/login');

    // Find elements using natural language
    const emailInput = await browser.aiLocator('email input field');
    await $(emailInput).setValue('user@example.com');

    const passwordInput = await browser.aiLocator('password field');
    await $(passwordInput).setValue('secret123');

    const loginButton = await browser.aiLocator('login button');
    await $(loginButton).click();

    // Verify login success
    const welcomeMsg = await browser.aiLocator('welcome message');
    await expect($(welcomeMsg)).toBeDisplayed();
  });
});
```

### Step 3: Run Your Tests

```bash
npx wdio run wdio.conf.ts
```

That's it! 🎉 The AI will find your elements automatically.

---

## 🎨 Dynamic Locators & Template Variables

Write **reusable locators** with template variables for data-driven testing.

### Basic Template Usage

```typescript
// Define a template with {variable} syntax
const locator = await browser.aiLocator('Edit button for {userName}', {
  variables: { userName: 'Alice' }
});
await $(locator).click();

// Reuse with different value
const locator2 = await browser.aiLocator('Edit button for {userName}', {
  variables: { userName: 'Bob' }
});
await $(locator2).click();
```

### Data-Driven Testing (Template Caching)

**The killer feature!** Use template caching to make **1 AI call** instead of N calls in loops:

```typescript
const users = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];

for (const userName of users) {
  const locator = await browser.aiLocator('Edit button for {userName}', {
    variables: { userName },
    cacheBy: 'template' // 🔥 Only 1 AI call for all 5 users!
  });
  await $(locator).click();
}

// Result:
// - Without template caching: 5 AI calls
// - With template caching: 1 AI call
// - 80% cost reduction! 💰
```

**How it works:**

1. **First call**: AI generates `//button[@data-user='{userName}']` (cached pattern)
2. **Next calls**: Pattern interpolated with new values (`Alice` → `Bob` → `Charlie`)
3. **No additional AI calls!** ⚡

### Global Context

Set variables once, use everywhere:

```typescript
describe('User Management', () => {
  beforeEach(async () => {
    await browser.setAiContext({
      userName: 'John Doe',
      role: 'admin'
    });
  });

  afterEach(async () => {
    await browser.clearAiContext();
  });

  it('should manage profile', async () => {
    // No need to pass variables repeatedly!
    const profileLoc = await browser.aiLocator('Profile for {userName}');
    await $(profileLoc).click();

    const dashboardLoc = await browser.aiLocator('Dashboard for {role}');
    await $(dashboardLoc).waitForDisplayed();
  });
});
```

### Multiple Variables

```typescript
const productLoc = await browser.aiLocator('Product {name} in {category}', {
  variables: {
    name: 'iPhone 15',
    category: 'Electronics'
  }
});
await $(productLoc).click();
```

📚 **[Full Dynamic Locators Guide →](docs/DYNAMIC_LOCATORS.md)**

---

## 🔌 Multi-Provider Support

Choose from multiple LLM providers based on your needs:

### OpenAI (Default)

```typescript
services: [
  [
    'ai-locator',
    {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini' // or 'gpt-4o', 'gpt-3.5-turbo'
    }
  ]
];
```

**Best for:** Production environments, highest accuracy, OpenAI credits

### OpenAI Router

Access 100+ models through a unified API:

```typescript
services: [
  [
    'ai-locator',
    {
      provider: 'openai-router',
      apiKey: process.env.OPENROUTER_API_KEY,
      model: 'openai/gpt-4o-mini', // or 'anthropic/claude-3', 'google/gemini-pro'
      baseUrl: 'https://openrouter.ai/api/v1/chat/completions' // optional
    }
  ]
];
```

**Best for:** Multi-model testing, cost optimization, model comparison

### Ollama (Local/Self-Hosted)

Run models locally for **zero API costs**:

```typescript
services: [
  [
    'ai-locator',
    {
      provider: 'ollama',
      model: 'llama3', // or 'mistral', 'codellama', 'gemma'
      baseUrl: 'http://localhost:11434' // optional
    }
  ]
];
```

**Best for:** Privacy-sensitive projects, no API costs, offline testing

### Provider Comparison

| Provider          | Cost    | Speed  | Accuracy   | Privacy  |
| ----------------- | ------- | ------ | ---------- | -------- |
| **OpenAI**        | 💰💰    | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | ☁️ Cloud |
| **OpenAI Router** | 💰      | ⚡⚡   | ⭐⭐⭐⭐   | ☁️ Cloud |
| **Ollama**        | 💰 Free | ⚡⚡   | ⭐⭐⭐     | 🔒 Local |

---

## 🎯 Configuration Options

### Complete Configuration Example

```typescript
services: [
  [
    'ai-locator',
    {
      // ===== Provider Settings =====
      provider: 'openai', // LLM provider (default: 'openai')
      apiKey: process.env.OPENAI_API_KEY, // API key (required for openai/openai-router)
      model: 'gpt-4o-mini', // Model name
      baseUrl: 'https://api.openai.com/v1/chat/completions', // Custom API endpoint (optional)

      // ===== Caching Settings =====
      cachePath: './.ai-locator-cache.json', // Cache file location (default: ./.ai-locator-cache.json)

      // ===== Retry & Resilience =====
      maxRetries: 2, // Max retry attempts (default: 2)

      // ===== Usage Tracking =====
      enableUsageTracking: true, // Track API usage (default: false)
      usageCachePath: './.ai-usage-cache.json' // Usage tracking file (default: ./.ai-locator-usage-cache.json)
    }
  ]
];
```

### Configuration by Provider

<details>
<summary><b>OpenAI Configuration</b></summary>

```typescript
{
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,        // Required
  model: 'gpt-4o-mini',                       // Optional (default: 'gpt-4o-mini')
  baseUrl: 'https://api.openai.com/v1/...',  // Optional (custom endpoint)
  enableUsageTracking: true                   // Optional (track token usage)
}
```

**Recommended Models:**

- `gpt-4o-mini` - Best balance of cost & performance
- `gpt-4o` - Highest accuracy
- `gpt-3.5-turbo` - Fastest & cheapest

</details>

<details>
<summary><b>OpenAI Router Configuration</b></summary>

```typescript
{
  provider: 'openai-router',
  apiKey: process.env.OPENROUTER_API_KEY,    // Required
  model: 'openai/gpt-4o-mini',               // Required (format: provider/model)
  baseUrl: 'https://openrouter.ai/api/v1/...',  // Optional
  enableUsageTracking: true
}
```

**Popular Models:**

- `openai/gpt-4o-mini` - OpenAI via Router
- `anthropic/claude-3-sonnet` - Claude
- `google/gemini-pro` - Gemini
- `meta-llama/llama-3-8b` - Llama

</details>

<details>
<summary><b>Ollama Configuration</b></summary>

```typescript
{
  provider: 'ollama',
  model: 'llama3',                           // Required
  baseUrl: 'http://localhost:11434'          // Optional (default: http://localhost:11434)
}
```

**Setup Ollama:**

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3

# Start Ollama server (runs on port 11434 by default)
ollama serve
```

**Popular Models:**

- `llama3` - Meta's latest (recommended)
- `mistral` - Fast & efficient
- `codellama` - Code-optimized
- `gemma` - Google's lightweight model

</details>

---

## 📖 API Reference

### `browser.aiLocator(description, options?)`

Find an element using AI-powered natural language.

```typescript
browser.aiLocator(
  description: string,
  options?: {
    variables?: Record<string, any> | (() => Record<string, any>);
    cacheBy?: 'smart' | 'template' | 'resolved';
    autoHeal?: boolean;
    alwaysAI?: boolean;
  }
): Promise<string>
```

**Parameters:**

- `description` - Natural language description of the element (supports `{variable}` placeholders)
- `options.variables` - Template variables or function returning variables
- `options.cacheBy` - Caching strategy (default: `'smart'`)
  - `'smart'` - Auto-detects best strategy
  - `'template'` - Cache by template pattern (best for loops)
  - `'resolved'` - Cache by resolved description
- `options.autoHeal` - Auto-regenerate if cached locator fails (default: `true`)
- `options.alwaysAI` - Skip cache, always use AI (default: `false`)

**Returns:** Promise<string> - Locator string (XPath or CSS selector)

**Example:**

```typescript
const locator = await browser.aiLocator('submit button');
await $(locator).click();
```

### Global Context Management

#### `browser.setAiContext(context)`

Set global variables for all AI locator calls.

```typescript
await browser.setAiContext({
  userName: 'John',
  environment: 'staging'
});
```

#### `browser.mergeAiContext(context)`

Merge variables into existing context without replacing.

```typescript
await browser.mergeAiContext({ role: 'admin' });
```

#### `browser.clearAiContext()`

Clear all global context variables.

```typescript
await browser.clearAiContext();
```

#### `browser.withAiContext(context, fn)`

Execute function with scoped context (auto-cleanup).

```typescript
await browser.withAiContext({ role: 'admin' }, async () => {
  const adminPanelLoc = await browser.aiLocator('Admin panel for {role}');
  await $(adminPanelLoc).click();
  // Context auto-cleared here
});
```

---

## 💡 Examples

### Example 1: Basic Usage

```typescript
it('should search and filter products', async () => {
  const searchInput = await browser.aiLocator('product search input');
  await $(searchInput).setValue('laptop');

  const searchBtn = await browser.aiLocator('search button');
  await $(searchBtn).click();

  const categoryFilter = await browser.aiLocator('electronics category filter');
  await $(categoryFilter).click();

  const firstProduct = await browser.aiLocator('first product in results');
  await $(firstProduct).click();
});
```

### Example 2: Data-Driven Testing

```typescript
const testData = [
  { name: 'Alice', email: 'alice@test.com', role: 'admin' },
  { name: 'Bob', email: 'bob@test.com', role: 'user' },
  { name: 'Charlie', email: 'charlie@test.com', role: 'manager' }
];

testData.forEach((user) => {
  it(`should create user ${user.name}`, async () => {
    // Template caching: Only 3 AI calls total (1 per unique template)
    const nameInput = await browser.aiLocator('name input', {
      cacheBy: 'template'
    });
    await $(nameInput).setValue(user.name);

    const emailInput = await browser.aiLocator('email input', {
      cacheBy: 'template'
    });
    await $(emailInput).setValue(user.email);

    const roleSelect = await browser.aiLocator('role dropdown', {
      cacheBy: 'template'
    });
    await $(roleSelect).selectByVisibleText(user.role);
  });
});
```

### Example 3: Page Object Pattern

```typescript
class LoginPage {
  constructor(private browser: Browser) {}

  async login(email: string, password: string) {
    await this.browser.setAiContext({ email, password });

    const emailInput = await this.browser.aiLocator('email input field');
    await $(emailInput).setValue(email);

    const pwdInput = await this.browser.aiLocator('password field');
    await $(pwdInput).setValue(password);

    const loginBtn = await this.browser.aiLocator('login button');
    await $(loginBtn).click();

    await this.browser.clearAiContext();
  }

  async verifyLogin(userName: string) {
    const welcome = await this.browser.aiLocator('welcome message showing {userName}', {
      variables: { userName }
    });
    await expect($(welcome)).toBeDisplayed();
  }
}

// Usage
const loginPage = new LoginPage(browser);
await loginPage.login('user@example.com', 'password123');
await loginPage.verifyLogin('John Doe');
```

### Example 4: E-Commerce Workflow

```typescript
describe('E-Commerce Checkout', () => {
  it('should complete purchase flow', async () => {
    // Search and select product
    const searchBox = await browser.aiLocator('product search box');
    await $(searchBox).setValue('running shoes');

    const searchBtn = await browser.aiLocator('search button');
    await $(searchBtn).click();

    // Filter by price
    const priceFilter = await browser.aiLocator('price range filter under $100');
    await $(priceFilter).click();

    // Select product
    const product = await browser.aiLocator('first product with 4+ star rating');
    await $(product).click();

    // Add to cart
    const sizeSelect = await browser.aiLocator('size dropdown');
    await $(sizeSelect).selectByVisibleText('US 10');

    const addToCart = await browser.aiLocator('add to cart button');
    await $(addToCart).click();

    // Checkout
    const cartIcon = await browser.aiLocator('shopping cart icon');
    await $(cartIcon).click();

    const checkoutBtn = await browser.aiLocator('proceed to checkout button');
    await $(checkoutBtn).click();
  });
});
```

---

## 🎓 Best Practices

### ✅ Do's

1. **Use descriptive natural language**

   ```typescript
   // Good
   await browser.aiLocator('primary navigation menu');
   await browser.aiLocator('submit button on payment form');

   // Avoid
   await browser.aiLocator('button');
   await browser.aiLocator('div');
   ```

2. **Use template caching in loops**

   ```typescript
   for (const user of users) {
     await browser.aiLocator('Edit {user}', {
       variables: { user },
       cacheBy: 'template' // ✅ Efficient
     });
   }
   ```

3. **Use global context for repeated variables**

   ```typescript
   await browser.setAiContext({ userName: 'John' });
   // Now use {userName} in multiple locators without passing it each time
   ```

4. **Clean up context after tests**

   ```typescript
   afterEach(async () => {
     await browser.clearAiContext();
   });
   ```

5. **Enable usage tracking in development**
   ```typescript
   enableUsageTracking: process.env.NODE_ENV === 'development';
   ```

### ❌ Don'ts

1. **Don't use vague descriptions**

   ```typescript
   // Bad
   await browser.aiLocator('button');
   await browser.aiLocator('link');

   // Good
   await browser.aiLocator('login button in header');
   await browser.aiLocator('forgot password link below form');
   ```

2. **Don't forget template caching in loops**

   ```typescript
   // Bad - N AI calls
   for (const item of items) {
     await browser.aiLocator(`Item ${item}`);
   }

   // Good - 1 AI call
   for (const item of items) {
     await browser.aiLocator('Item {item}', {
       variables: { item },
       cacheBy: 'template'
     });
   }
   ```

3. **Don't use `alwaysAI` unnecessarily**

   ```typescript
   // Wastes AI calls
   await browser.aiLocator('button', { alwaysAI: true });
   ```

4. **Don't hardcode provider-specific values**

   ```typescript
   // Bad
   apiKey: 'sk-abc123...';

   // Good
   apiKey: process.env.OPENAI_API_KEY;
   ```

---

## 🔍 Auto-Heal Feature

Automatically regenerates locators when cached ones fail:

```typescript
// Auto-heal enabled (default)
const locator = await browser.aiLocator('login button', {
  autoHeal: true // Regenerates if cached locator doesn't work
});

// Auto-heal disabled (faster, but no regeneration)
const locator = await browser.aiLocator('login button', {
  autoHeal: false // Uses cached locator even if it fails
});
```

| Feature    | `autoHeal: true`         | `autoHeal: false`     |
| ---------- | ------------------------ | --------------------- |
| Resilience | High (adapts to changes) | Low (static)          |
| Speed      | Slower (verification)    | Faster (no check)     |
| Best for   | Changing UIs, CI/CD      | Stable UIs, debugging |

---

## 📊 Usage Tracking

Monitor your AI API consumption:

```typescript
services: [
  [
    'ai-locator',
    {
      enableUsageTracking: true,
      usageCachePath: './.ai-usage-cache.json'
    }
  ]
];
```

**Generated file:**

```json
{
  "entries": [
    {
      "timestamp": "2025-01-15T10:30:00.000Z",
      "aiClient": "OpenAI",
      "model": "gpt-4o-mini",
      "description": "login button",
      "url": "https://example.com/login",
      "promptTokens": 150,
      "completionTokens": 20,
      "totalTokens": 170,
      "success": true,
      "selector": "button[type='submit']"
    }
  ],
  "summary": {
    "totalRequests": 45,
    "successfulRequests": 43,
    "failedRequests": 2,
    "totalTokens": 7650,
    "estimatedCost": "$0.38"
  }
}
```

---

## 🛠️ Troubleshooting

<details>
<summary><b>Elements Not Found</b></summary>

**Problem:** AI can't find the element

**Solutions:**

1. Make description more specific:

   ```typescript
   // Instead of
   await browser.aiLocator('button');

   // Try
   await browser.aiLocator('blue login button in header');
   ```

2. Ensure element is visible:

   ```typescript
   await browser.pause(1000); // Wait for page load
   const locator = await browser.aiLocator('submit button');
   ```

3. Check if element is in iframe:
   ```typescript
   await browser.switchToFrame(0);
   const locator = await browser.aiLocator('button');
   ```

</details>

<details>
<summary><b>Too Many AI Calls</b></summary>

**Problem:** High API usage/costs

**Solutions:**

1. Use template caching:

   ```typescript
   cacheBy: 'template';
   ```

2. Increase cache hits by consistent descriptions:

   ```typescript
   // Good - same description = cache hit
   await browser.aiLocator('login button');
   await browser.aiLocator('login button');

   // Bad - different descriptions = cache miss
   await browser.aiLocator('login button');
   await browser.aiLocator('sign in button');
   ```

3. Use Ollama for zero API costs:
   ```typescript
   provider: 'ollama';
   ```

</details>

<details>
<summary><b>Slow Test Execution</b></summary>

**Problem:** Tests running slowly

**Solutions:**

1. Disable auto-heal for stable UIs:

   ```typescript
   autoHeal: false;
   ```

2. Use template caching:

   ```typescript
   cacheBy: 'template';
   ```

3. Pre-warm cache by running tests once

</details>

<details>
<summary><b>Variables Not Replacing</b></summary>

**Problem:** `{variable}` not replaced

**Solution:** Pass variables object:

```typescript
await browser.aiLocator('User {name}', {
  variables: { name: 'John' } // Don't forget this!
});
```

</details>

---

## 🧪 Testing

This project uses **Vitest** for unit testing, ensuring reliability and code quality.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

The test suite includes comprehensive coverage for:

- ✅ **DOM Parser** - HTML parsing and sanitization (`tests/utils/domParser.test.ts`)
- ✅ **XPath Utils** - XPath interpolation and variable replacement (`tests/utils/xpathUtils.test.ts`)
- ✅ **Template Interpolation** - Dynamic variable substitution (`tests/utils/templateInterpolation.test.ts`)
- ✅ **Cache Management** - Locator caching strategies (`tests/locator/cache.test.ts`)
- ✅ **Usage Tracking** - API usage monitoring (`tests/utils/usageCache.test.ts`)
- ✅ **Locator Strategies** - Smart, template, and resolved caching (`tests/locator/strategies.test.ts`)

### Test Coverage

```
File                     | % Stmts | % Branch | % Funcs | % Lines
-------------------------|---------|----------|---------|--------
All files                |   85+   |   80+    |   85+   |   85+
  utils/                 |   90+   |   85+    |   90+   |   90+
  locator/               |   85+   |   80+    |   85+   |   85+
  ai/                    |   80+   |   75+    |   80+   |   80+
```

### Writing Tests

When contributing, please ensure:

1. **Write tests** for new features
2. **Maintain coverage** above 80%
3. **Follow conventions** - Use descriptive test names
4. **Mock external dependencies** - Especially AI API calls

**Example Test:**

```typescript
import { describe, it, expect } from 'vitest';
import { interpolateXPath } from '../src/utils/xpathUtils';

describe('XPath Interpolation', () => {
  it('should replace single variable', () => {
    const xpath = "//button[@data-user='{userName}']";
    const result = interpolateXPath(xpath, { userName: 'Alice' });
    expect(result).toBe("//button[@data-user='Alice']");
  });

  it('should handle multiple variables', () => {
    const xpath = "//div[@id='{id}'][@class='{className}']";
    const result = interpolateXPath(xpath, { id: 'test', className: 'active' });
    expect(result).toBe("//div[@id='test'][@class='active']");
  });
});
```

### Continuous Integration

Tests run automatically on:

- ✅ Every pull request
- ✅ Every commit to main branch
- ✅ Before package release

---

## 📚 Documentation

- 📖 **[Dynamic Locators Guide](docs/DYNAMIC_LOCATORS.md)** - Complete guide to template variables & caching
- 🚀 **[Quick Reference](docs/QUICK_REFERENCE.md)** - Cheat sheet for dynamic locators
- 🔄 **[Migration Guide](docs/MIGRATION_GUIDE.md)** - Upgrade from traditional selectors

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Workflow

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Build the project
npm run build
```

### GitHub Actions

This project uses GitHub Actions for CI/CD:

- **CI Workflow** - Runs automatically on every PR and push
  - Tests on Node.js 16, 18, and 20
  - Runs test suite
  - Generates coverage reports
  - Can be triggered manually

- **Publish Workflow** - Manual trigger only
  - Bumps version (patch/minor/major)
  - Runs tests and builds
  - Publishes to NPM
  - Creates GitHub release with release notes
  - Supports NPM tags (latest, beta, alpha)

---

## 📦 Publishing

This package is published to NPM automatically using GitHub Actions.

### For Maintainers

To publish a new version:

1. Go to **Actions** tab in GitHub
2. Select **Publish to NPM** workflow
3. Click **Run workflow**
4. Choose:
   - **Version bump**: patch (1.0.X), minor (1.X.0), or major (X.0.0)
   - **NPM tag**: latest, beta, or alpha
   - **Create release**: Yes/No
5. Click **Run workflow**

The workflow will:
- ✅ Run all tests
- ✅ Build the project
- ✅ Bump version in package.json
- ✅ Publish to NPM
- ✅ Create GitHub release (optional)
- ✅ Generate release notes

### Setup Required

Add these secrets to your GitHub repository:

- `NPM_TOKEN` - Your NPM access token ([Create one here](https://www.npmjs.com/settings/~/tokens))

---

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🌟 Show Your Support

If this project helped you, please give it a ⭐️!

---

## 💬 Support & Community

- 🐛 [Report Issues](https://github.com/your-repo/wdio-ai-locator-service/issues)
- 💡 [Feature Requests](https://github.com/your-repo/wdio-ai-locator-service/discussions)
- 📧 [Email Support](mailto:support@example.com)

---

<div align="center">

**Made with ❤️ for the WebdriverIO community**

[⬆ Back to Top](#-wdio-ai-locator-service)

</div>

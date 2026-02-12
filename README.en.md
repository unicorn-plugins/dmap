🇰🇷 [한국어](README.md) | 🇺🇸 [English](#dmap-builder)

# DMAP Builder

> A declarative framework for building multi-agent plugins without code

- [DMAP Builder](#dmap-builder)
  - [Overview](#overview)
    - [Problem: Complexity of Traditional Multi-Agent Development](#problem-complexity-of-traditional-multi-agent-development)
    - [How DMAP Solves It](#how-dmap-solves-it)
    - [Core Values](#core-values)
  - [Quick Start](#quick-start)
    - [Prerequisites](#prerequisites)
    - [DMAP Builder Installation](#dmap-builder-installation)
    - [Using on Web](#using-on-web)
    - [Using with Claude Code](#using-with-claude-code)
  - [Core Concepts](#core-concepts)
    - [Skills = Department Heads](#skills--department-heads)
    - [Agents = Specialists](#agents--specialists)
    - [Gateway = Interpreter](#gateway--interpreter)
    - [Resource Marketplace = Shared Drive](#resource-marketplace--shared-drive)
    - [Architecture (Clean Architecture)](#architecture-clean-architecture)
  - [How It Works](#how-it-works)
    - [Prompt Assembly](#prompt-assembly)
    - [4-Tier Model Mapping](#4-tier-model-mapping)
    - [Skill Activation Paths](#skill-activation-paths)
  - [Declarative A2A (Cross-Plugin Delegation)](#declarative-a2a-cross-plugin-delegation)
    - [Traditional A2A vs DMAP Declarative A2A](#traditional-a2a-vs-dmap-declarative-a2a)
    - [How Declarative A2A Works](#how-declarative-a2a-works)
  - [DMAP Ecosystem](#dmap-ecosystem)
  - [Plugin Development Workflow](#plugin-development-workflow)
  - [Project Structure](#project-structure)
  - [Standards](#standards)
  - [Practical Example](#practical-example)
    - [Agent Composition (5 Specialists)](#agent-composition-5-specialists)
    - [Skill Composition (9 Workflows)](#skill-composition-9-workflows)
  - [Roadmap](#roadmap)
  - [License](#license)

---

## Overview

**DMAP (Declarative Multi-Agent Plugin)** is
a declarative plugin architecture standard that defines
multi-agent systems using **only Markdown (prompts) and YAML (configuration)** -- no code required.

### Problem: Complexity of Traditional Multi-Agent Development

A single agent is manageable, but the moment multiple agents need to collaborate,
complexity explodes. Limitations of conventional approaches:

- **High entry barrier** -- Learning framework-specific SDKs such as LangChain, CrewAI, AutoGen required
- **Runtime lock-in** -- Tightly coupled to a specific framework, resulting in low portability
- **Difficult maintenance** -- Code-based definitions require full rewrites on change

> "Do we really need code just to define an agent?"

### How DMAP Solves It

Declare "WHAT" instead of "HOW."
Like telling a taxi driver "Gangnam Station, please" instead of dictating every turn -- just state the destination.

### Core Values

| Value | Description |
|-------|-------------|
| **Declarative Specification** | Define agents with Markdown + YAML instead of code |
| **Runtime Neutral** | Runs on any runtime -- Claude Code, Codex CLI, etc. |
| **Separation of Concerns** | Unidirectional dependency: Skills(routing) -> Agents(execution) -> Gateway(mapping) |
| **Non-Developer Accessibility** | Anyone who can write Markdown can build a plugin |
| **Domain Agnostic** | Applicable to any domain: code generation, education, documentation, business workflows |

> **Current Version Notice (Feb 2026)**:
> The DMAP Builder is currently available **for Claude Code only**.
> The DMAP standard itself is designed to be runtime-neutral, with
> **multi-runtime expansion planned** for Codex CLI, Gemini CLI, and others.

[Top](#dmap-builder)

---

## Quick Start

### Prerequisites

**1. Basic Tool Installation**

| Tool | Minimum Version | Purpose |
|------|-----------------|---------|
| Git | 2.x | Plugin marketplace (GitHub repository clone) |
| Node.js | 18+ | MCP server execution (`npx` command) |
| VS Code | Latest | Code editor (`code` command) |

**2. PATH Setup**

Add the `~/.local/bin` directory to PATH:

```bash
# Mac users
code ~/.zshrc

# Linux/Windows users (Windows: use Git Bash terminal)
code ~/.bashrc
```

Add the following to the end of the file:

```bash
export PATH=~/.local/bin:$PATH
```

> **(Important)** After adding the path, run `source ~/.bashrc` or `source ~/.zshrc`

**3. Claude Code Installation**

```bash
# macOS/Linux
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex
```

Initial configuration after installation:

```bash
claude config
```

**4. Oh My ClaudeCode (OMC) Installation**

Run sequentially in the Claude Code prompt:

```
/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode
```

Install only context7 for MCP during setup:

```
/oh-my-claudecode:omc-setup
```

> The DMAP Builder leverages OMC's skill boosting (ralplan, ralph, etc.), so OMC installation is required.

### DMAP Builder Installation

```bash
claude plugin marketplace add unicorn-plugins/dmap
claude plugin install dmap@unicorn
```

Initial setup: Run Claude Code, then
```
/dmap:setup
```

### Using on Web

Clone DMAP to your PC and run the web app to use the DMAP Builder in your browser.
![](images/2026-02-12-18-21-46.png) 

**1. Clone DMAP**

```bash
git clone https://github.com/unicorn-plugins/dmap.git
cd dmap
```

**2. Run DMAP Web**

```bash
cd dmap-web
npm install
npm run dev
```

**3. Use in Browser**

Open http://localhost:5173 then:

Click 'Write Requirements' to start plugin development

### Using with Claude Code

Run '/dmap:requirement-writer' to start from requirements writing

| Command | Description |
|---------|-------------|
| `/dmap:develop-plugin` | Develop a plugin via 4-Phase workflow |
| `/dmap:requirement-writer` | Requirements specification writing support (AI auto-completion) |
| `/dmap:publish` | Deploy completed plugin to GitHub |
| `/dmap:add-ext-skill` | Add external skill (ext-{target plugin}) |
| `/dmap:remove-ext-skill` | Remove external skill (ext-{target plugin}) |
| `/dmap:setup` | Installation verification (plugin structure and standards check) |
| `/dmap:help` | Usage guide |

Basic usage flow:

```
1. /dmap:setup                -- Verify installation status
2. /dmap:requirement-writer   -- Write requirements specification (AI auto-completion)
3. /dmap:develop-plugin       -- Automatically execute: requirements -> design -> development -> verification
4. /dmap:publish              -- Deploy to GitHub (repo creation, commit, push)
```

> **End-to-End Automation**: AI handles the entire process from requirements definition to GitHub deployment.
> Users only need to approve at each stage.

[Top](#dmap-builder)

---

## Core Concepts

DMAP's structure is easy to understand when compared to a company organization.

### Skills = Department Heads

The department head role that distributes work.
Receives user requests and decides which agent gets which task.
An entire workflow declared in a single `SKILL.md` file.

| Item | Content |
|------|---------|
| Core File | `skills/{name}/SKILL.md` |
| Role | Routing + orchestration |
| Types | core, setup, orchestrator, planning |

### Agents = Specialists

The specialists who perform the actual work.
Each agent consists of 3 files.

| File | Role |
|------|------|
| `AGENT.md` | Role definition (goals, workflow, output format) |
| `agentcard.yaml` | Metadata (name, version, tier, constraints) |
| `tools.yaml` | Abstract tool declarations |

### Gateway = Interpreter

The interpreter that translates abstract declarations into concrete execution environments.
When an agent declares "file search tool,"
the Gateway maps it to the actual tool for the current runtime.

| File | Role |
|------|------|
| `install.yaml` | MCP/LSP server and custom tool installation declarations |
| `runtime-mapping.yaml` | Tier mapping, tool mapping, action mapping |

### Resource Marketplace = Shared Drive

A shared repository of guides, templates, samples, and tools.
A common resource pool available to multiple plugins.

| Category | Path | Purpose |
|----------|------|---------|
| Guides | `resources/guides/` | Technical reference documents |
| Templates | `resources/templates/` | Deliverable generation templates |
| Samples | `resources/samples/` | Implementation reference samples |
| Tools | `resources/tools/` | Custom apps / CLI tools |

### Architecture (Clean Architecture)

These components follow Clean Architecture principles.
With unidirectional dependency in the order Skills -> Agents -> Gateway,
each part can be modified or replaced independently.

```
Delegated:  Input -> Skills(Controller) -> Agents(Service) -> Gateway -> Runtime
Direct:     Input -> Skills(Controller) ----------------------> Gateway -> Runtime
```

[Top](#dmap-builder)

---

## How It Works

### Prompt Assembly

DMAP assembles prompts in a 3-layer process.

| Layer | Source | Content |
|-------|--------|---------|
| 1. Common Static | Gateway `runtime-mapping.yaml` | Runtime-wide settings (tier mapping, tool mapping) |
| 2. Per-Agent Static | `AGENT.md` + `agentcard.yaml` + `tools.yaml` | Agent role, metadata, tool declarations |
| 3. Dynamic | Task instructions passed by the skill | Concrete task content based on user request |

Think of it like a travel guidebook:
Basic info (common rules) + destination-specific info (agent role) + today's itinerary (task instructions) = complete guidebook.

### 4-Tier Model Mapping

Tasks are divided into 4 complexity levels, each assigned an appropriate AI model.
Simple file searches go to a lightweight model; complex architecture design goes to a powerful model.

| Tier | Purpose | Claude Mapping Example |
|------|---------|----------------------|
| HEAVY | Extremely complex reasoning, strategy formulation | Opus (max thinking) |
| HIGH | Complex analysis, architecture design | Opus |
| MEDIUM | Standard implementation, general tasks | Sonnet |
| LOW | Simple lookups, file searches | Haiku |

When task difficulty increases during execution, automatic escalation to a higher model occurs.

### Skill Activation Paths

Skills are activated via two paths:

1. **Direct invocation** -- Call the exact skill with a slash command (`/dmap:develop-plugin`)
2. **Via Core** -- When an ambiguous request arrives, the Core skill analyzes intent and routes to the appropriate skill

The runtime automatically scans the `skills/` directory to discover available skills.

[Top](#dmap-builder)

---

## Declarative A2A (Cross-Plugin Delegation)

DMAP solves cross-plugin collaboration through the **External Skill (ext-{})** pattern.
While traditional A2A (Agent-to-Agent) protocols require HTTP endpoints, Agent Cards, and message buses,
DMAP achieves cross-plugin delegation with **a single Markdown file**.

### Traditional A2A vs DMAP Declarative A2A

| Comparison | Traditional A2A (Google A2A, etc.) | DMAP Declarative A2A |
|------------|:----------------------------------:|:--------------------:|
| Communication | HTTP/JSON-RPC endpoints | Skill→Skill call (FQN) |
| Interface Declaration | Agent Card (JSON) | Plugin spec (Markdown) |
| Infrastructure Required | Service discovery, message bus | None (Zero Infrastructure) |
| Integration Code | SDK-based client code | ext-{} skill auto-generated |
| Lifecycle Management | Manual implementation | add/remove-ext-skill utilities |

### How Declarative A2A Works

1. **Publish plugin spec** — Target plugin registers its spec (FQN, ARGS schema, execution paths) in the Resource Marketplace
2. **Generate ext-{} skill** — `/add-ext-skill` utility auto-generates an External skill from the spec
3. **Skill→Skill delegation** — Caller collects domain context and invokes the target skill via FQN
4. **Lifecycle management** — `/remove-ext-skill` cleanly removes integrations no longer needed

```
Traditional A2A:  HTTP endpoints + Agent Card + Message Bus + SDK client
DMAP A2A:         Markdown spec  + ext-{} skill + Skill tool call
```

> **Core Philosophy**: "The best infrastructure is no infrastructure" —
> Plugin collaboration through **document-based contracts**, not protocols.

[Top](#dmap-builder)

---

## DMAP Ecosystem

The DMAP ecosystem is structured in layers: **DMAP Builder → AI Teams (Plugins) → External Plugins → AI Services**.
Each AI team freely attaches and detaches external plugins (Plug & Unplug) to extend its capabilities.

```
┌─────────────────────────────────────────────┐
│              DMAP Builder                    │
│       (Multi-Agent Plugin Generator)         │
└──────────────────┬──────────────────────────┘
                   │ generates
        ┌──────────┼──────────┐
        ▼          ▼          ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │blog-poster│ │curriculum│ │   ...    │
  │  AI Team │ │  AI Team │ │  AI Team │
  └────┬─────┘ └────┬─────┘ └────┬─────┘
       │  ext-{}    │  ext-{}    │  ext-{}
       │  plug      │  plug      │  plug
       ▼            ▼            ▼
  ┌─────────────────────────────────────────┐
  │       External Plugin Pool               │
  │  ┌───────┐ ┌────────────────────┐       │
  │  │ Abra  │ │github-release-mgr  │  ...  │
  │  │ (Dev) │ │(Release)           │       │
  │  └───────┘ └────────────────────┘       │
  └─────────────────────────────────────────┘
```

| Real-World Analogy | DMAP Ecosystem | Role |
|-------------------|----------------|------|
| Staffing agency | DMAP Builder | Multi-agent plugin generator |
| Project team | Purpose-specific plugin | AI Team (domain expert group) |
| External tools used by team | External plugin (ext-{}) | Plug & Unplug extension modules |
| Delivered service | AI Service | Output created by the AI team |

> Detailed documentation: [DMAP Ecosystem Structure](https://github.com/unicorn-plugins/dmap/blob/main/docs/idea/dmap-ecosystem.md)

[Top](#dmap-builder)

---

## Plugin Development Workflow

The entire pipeline from requirements to GitHub deployment is **End-to-End automated**.
Plugin development starts with `/dmap:requirement-writer` to create the requirements specification,
then `/dmap:develop-plugin` automatically executes a 4-Phase workflow,
and `/dmap:publish` deploys to GitHub. User approval is obtained at each stage.

```
/dmap:requirement-writer → /dmap:develop-plugin (Phase 1~4) → /dmap:publish
```

| Phase | Stage | Key Activities |
|:-----:|-------|---------------|
| 1 | Requirements Gathering | Analyze requirements specification, assess plugin suitability, collect missing information ([sample](https://github.com/unicorn-plugins/abra/blob/main/output/requirement.md)) |
| 2 | Design and Planning | Select shared resources, design plugin structure, write development plan |
| 3 | Plugin Development | Generate skeleton, develop Gateway/Agent/Skill/Command, write README |
| 4 | Verification and Completion | Validate DMAP standard compliance, final report, register shared resources (optional) |

**Phase 3 Development Order:**

1. Generate plugin skeleton (`.claude-plugin/`, directory structure)
2. Gateway configuration (`install.yaml`, `runtime-mapping.yaml`)
3. Copy shared resources (Resource Marketplace -> plugin directory)
4. Agent development (`AGENT.md`, `agentcard.yaml`, `tools.yaml`)
5. Skill development (setup required, help recommended, feature skills)
6. Create `commands/` entry points
7. Custom app/CLI development (if needed)
8. Write `README.md`

[Top](#dmap-builder)

---

## Project Structure

```
dmap/
├── .claude-plugin/          # Plugin manifest
│   ├── plugin.json          #   Plugin metadata
│   └── marketplace.json     #   Marketplace registration info
├── standards/               # DMAP standard documents
│   ├── plugin-standard.md          # Main standard (architecture, directory, deployment)
│   ├── plugin-standard-agent.md    # Agent package standard
│   ├── plugin-standard-skill.md    # Skill authoring standard
│   └── plugin-standard-gateway.md  # Gateway configuration standard
├── resources/               # Resource Marketplace (shared resource pool)
│   ├── plugin-resources.md  #   Resource catalog
│   ├── guides/              #   Guide documents
│   ├── templates/           #   Template files
│   ├── samples/             #   Sample files
│   └── tools/               #   Tools (custom apps/CLI)
├── skills/                  # DMAP Builder skills
│   ├── develop-plugin/      #   Plugin development (4-Phase)
│   ├── requirement-writer/  #   Requirements specification writing support
│   ├── publish/             #   GitHub deployment
│   ├── add-ext-skill/       #   External skill add utility
│   ├── remove-ext-skill/    #   External skill remove utility
│   ├── ext-{plugin}/        #   External plugin delegation (Declarative A2A)
│   ├── setup/               #   Initial setup
│   └── help/                #   Usage guide
├── commands/                # Slash command entry points
│   ├── develop-plugin.md
│   ├── requirement-writer.md
│   ├── publish.md
│   ├── add-ext-skill.md
│   ├── remove-ext-skill.md
│   ├── ext-{plugin}.md
│   ├── setup.md
│   └── help.md
├── references/              # Reference documents
└── docs/                    # Presentation / paper materials
```

[Top](#dmap-builder)

---

## Standards

The DMAP standard consists of 4 core documents and a resource catalog.

| Document | Path | Description |
|----------|------|-------------|
| Main Standard | `standards/plugin-standard.md` | Architecture, directory structure, namespace, deployment |
| Agent Standard | `standards/plugin-standard-agent.md` | Agent package composition (AGENT.md, agentcard.yaml, tools.yaml) |
| Skill Standard | `standards/plugin-standard-skill.md` | Skill types, authoring rules, type-specific templates |
| Gateway Standard | `standards/plugin-standard-gateway.md` | install.yaml, runtime-mapping.yaml authoring rules |
| Resource Catalog | `resources/plugin-resources.md` | Shared resource list (guides, templates, samples, tools) |
| Plugin Development Guide | `resources/guides/plugin/plugin-dev-guide.md` | 4-Phase workflow detailed guide |

[Top](#dmap-builder)

---

## Practical Example

**abra plugin** -- A Dify workflow DSL automation plugin.
Automatically generates DSL (Domain Specific Language) for the Dify platform
and performs prototyping.

Git Repository: https://github.com/unicorn-plugins/abra.git

### Agent Composition (5 Specialists)

| Agent | Role |
|-------|------|
| scenario-analyst | Requirements analysis, scenario authoring |
| dsl-architect | Dify DSL code design |
| plan-writer | Development plan authoring |
| prototype-runner | Dify prototyping execution |
| agent-developer | Final Agent code development |

### Skill Composition (9 Workflows)

| Skill | Purpose |
|-------|---------|
| setup | Initial environment setup |
| core | Natural language routing |
| help | Usage guide (immediate output) |
| dify-setup | Dify Docker environment setup |
| scenario | Requirements scenario generation |
| dsl-generate | Dify DSL auto-generation |
| prototype | Dify prototyping automation |
| dev-plan | Development plan authoring |
| develop | AI Agent development and deployment |

User flow: Scenario generation -> DSL generation -> Prototyping -> Development plan -> Agent development

[Top](#dmap-builder)

---

## Roadmap

| Stage | Goal | Description |
|-------|------|-------------|
| **Current** | Claude Code stabilization | Plugin development and execution based on DMAP standard on Claude Code runtime |
| **Short-term** | Multi-runtime support | Support for various execution environments including Codex CLI, Gemini CLI |
| **Mid-term** | Marketplace / Community | Build plugin sharing marketplace, foster open-source community ecosystem |
| **Long-term** | No-code UI | Visual plugin builder for non-developers (drag and drop) |

[Top](#dmap-builder)

---

## License

MIT License

Copyright (c) 2026 Unicorn Inc.
https://github.com/unicorn-plugins/dmap

[Top](#dmap-builder)

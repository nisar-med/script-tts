# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] **Component-First**: All UI components extend shadcn/ui base components, no custom implementations without justification
- [ ] **TailwindCSS v4 Theme**: All styling uses theme CSS custom properties, no hardcoded colors or inline styles
- [ ] **Type-Safe**: All interfaces defined, strict TypeScript mode enabled, no `any` types without documentation
- [ ] **Security-First API**: API keys never exposed to client, authentication properly implemented
- [ ] **Audio UX**: User control and feedback prioritized, progress indicators and error handling implemented

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

React/TypeScript web application with Express.js backend:

```text
# Frontend (React + Vite + TypeScript)
components/                 # React components (shadcn/ui based)
├── ui/                    # shadcn/ui base components
├── AudioPlayer.tsx        # Audio playback component
├── Auth.tsx              # Authentication component
├── DialoguePreview.tsx   # Script dialogue preview
├── Header.tsx            # App header component
├── ScriptInput.tsx       # Script input form
└── icons.tsx             # Icon components (lucide-react)

contexts/                  # React contexts
├── AuthContext.tsx       # Google OAuth context

services/                  # Frontend services
├── geminiService.ts      # Gemini AI API integration

utils/                     # Utility functions
├── audioUtils.ts         # Audio processing utilities
├── cn.ts                 # Class name utilities (clsx + tailwind-merge)
└── tokenManager.ts       # OAuth token management

themes/                    # TailwindCSS v4 themes
├── neutral-light.css     # Light theme (oklch colors)
└── slate-dark.css        # Dark theme (oklch colors)

# Backend (Express.js + Node.js)
server/
├── server.js             # Main server with API proxy
├── auth/
│   └── oidc.js          # Google OIDC token verification
└── package.json         # Server dependencies

# Configuration
index.css                 # TailwindCSS v4 imports + theme
components.json           # shadcn/ui configuration
tsconfig.json            # TypeScript configuration
vite.config.ts           # Vite bundler configuration
types.ts                 # Global TypeScript interfaces
constants.ts             # App constants (voices, languages)
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

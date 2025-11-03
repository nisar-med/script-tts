<!--
  SYNC IMPACT REPORT:
  Version change: 0.0.0 → 1.0.0
  Modified principles: N/A (initial version)
  Added sections: Core Principles, Design System Requirements, Development Standards, Governance
  Removed sections: N/A (initial version)
  Templates requiring updates:
    ✅ Updated .specify/templates/plan-template.md - Constitution Check gates aligned with 5 principles, project structure updated for React/TypeScript
    ✅ Updated .specify/templates/spec-template.md - Added mandatory UI/UX Requirements section with shadcn/ui and theme requirements
    ✅ Updated .specify/templates/tasks-template.md - Updated Setup and Foundational phases with design system and security tasks
  Runtime guidance updates:
    ✅ Updated CLAUDE.md - Added Constitution & Design System section, Design System technical details, reorganized Important Files
    ✅ Updated README.md - Added constitution reference in Documentation section
  Follow-up TODOs: None
-->

# Script-TTS Constitution

## Core Principles

### I. Component-First Architecture
All UI functionality MUST be built using shadcn/ui components as the foundation. Components MUST be self-contained, reusable, and follow the established component library patterns. Custom components MUST extend shadcn/ui base components rather than building from scratch. Each component MUST have clear props interface and consistent styling patterns.

**Rationale**: Ensures design consistency, reduces development time, and maintains accessibility standards across the application.

### II. TailwindCSS v4 Theme System
All styling MUST use TailwindCSS v4 with the established theme system (neutral-light.css and slate-dark.css). Color values MUST use CSS custom properties defined in theme files using oklch() color space. NO hardcoded colors or inline styles. Theme switching MUST be supported through CSS imports without JavaScript theme toggles.

**Rationale**: Provides consistent design language, enables seamless theme switching, and ensures future-proof styling with modern color systems.

### III. Type-Safe Development (NON-NEGOTIABLE)
TypeScript MUST be used for all code. All interfaces MUST be defined in types.ts or co-located type files. API responses MUST have corresponding TypeScript interfaces. No `any` types except for explicitly documented third-party library integration. ESLint and TypeScript strict mode MUST be enabled.

**Rationale**: Prevents runtime errors, improves development experience, and ensures code maintainability as the project scales.

### IV. Security-First API Design
Gemini API keys MUST never be exposed to the client. Production mode MUST route all API calls through `/api-proxy` server endpoint with Google OAuth authentication. Development mode MAY use direct API calls for convenience but MUST NOT be deployed. All authentication tokens MUST be automatically refreshed before expiry.

**Rationale**: Protects API credentials, ensures user data privacy, and follows OAuth 2.0 best practices for secure authentication flows.

### V. User-Centric Audio Experience
Audio generation MUST prioritize user control and feedback. Voice assignment MUST be intuitive with gender-based defaults but full user customization. Audio processing MUST provide progress indicators and error handling. Generated audio MUST be immediately playable with download capabilities.

**Rationale**: Ensures excellent user experience for the core functionality and handles the complex async nature of AI audio generation gracefully.

## Design System Requirements

### Component Standards
- All UI components MUST extend shadcn/ui base components
- Component variants MUST use class-variance-authority (CVA) for consistent styling
- Icons MUST use lucide-react icon library for consistency
- Forms MUST use proper form validation with error states
- Loading states MUST be implemented for all async operations

### Theme Consistency  
- Color tokens MUST be defined in theme CSS files using oklch() color space
- Theme files MUST maintain semantic color naming (primary, secondary, muted, etc.)
- Custom colors MUST be added to theme files, not as arbitrary values
- Border radius MUST use theme-defined radius tokens (--radius, --radius-lg, etc.)
- Typography MUST use consistent scale and theme-aware colors

### Accessibility Requirements
- All interactive elements MUST have proper ARIA labels
- Color contrast MUST meet WCAG AA standards in both light and dark themes  
- Keyboard navigation MUST be fully supported
- Screen reader compatibility MUST be maintained for all audio controls
- Focus indicators MUST be visible and theme-aware

## Development Standards

### Code Organization
- React components MUST be organized in `/components` directory with clear naming
- Utility functions MUST be placed in `/utils` with descriptive filenames
- Service layer MUST be separated in `/services` directory
- Context providers MUST be organized in `/contexts` directory
- Type definitions MUST be centralized in `types.ts` or co-located

### Performance Standards
- Bundle size MUST be optimized through proper code splitting
- Images and assets MUST be optimized for web delivery
- API calls MUST implement proper caching where appropriate
- Audio streaming MUST be implemented for large audio files
- Loading states MUST prevent UI blocking during generation

### Testing Requirements
- Critical user flows MUST have integration tests
- Component props and states MUST be validated
- API error scenarios MUST be tested and handled gracefully
- Audio generation edge cases MUST be documented and handled
- OAuth flow MUST be tested across different scenarios

## Governance

This constitution supersedes all other development practices and coding standards. All feature development, code reviews, and architectural decisions MUST comply with these principles. Complexity that violates these principles MUST be justified in writing with clear rationale and simpler alternatives explanation.

Amendment procedure: Changes require documentation of impact across all affected templates, version bump following semantic versioning, and update of dependent artifacts. Use `CLAUDE.md` for runtime development guidance and specific implementation details.

All code reviews MUST verify:
1. shadcn/ui component usage over custom implementations
2. TailwindCSS v4 theme compliance with no hardcoded styles  
3. TypeScript strict mode compliance with proper interfaces
4. Security compliance for API key handling and authentication
5. Audio UX standards for progress feedback and error handling

**Version**: 1.0.0 | **Ratified**: 2025-11-03 | **Last Amended**: 2025-11-03

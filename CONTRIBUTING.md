# Contributing to gemini-mcp-server

Thank you for your interest in contributing to gemini-mcp-server! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/gemini-mcp-server.git`
3. Install dependencies: `npm install`
4. Build the project: `npm run build`

## Development Workflow

### Making Changes

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes in the `src/` directory
3. Build and test: `npm run build`
4. Commit your changes with a clear message

### Code Style

- Use TypeScript for all source code
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic

### Testing Changes

Before submitting a PR:

1. Build the project: `npm run build`
2. Test the server starts: `GOOGLE_CLOUD_PROJECT=<your-test-project> GOOGLE_CLOUD_LOCATION=global node build/index.js`
3. Verify the tool list works as expected

### Submitting a Pull Request

1. Push your branch to your fork
2. Open a Pull Request against the main repository
3. Describe your changes clearly in the PR description
4. Link any relevant issues

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person

## Questions?

If you have questions, feel free to open an issue for discussion.

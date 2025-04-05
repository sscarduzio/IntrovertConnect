# Contributing to IntroConnect

Thank you for considering contributing to IntroConnect! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful, inclusive, and harassment-free environment for everyone.

## How Can I Contribute?

### Reporting Bugs

Before submitting a bug report:

- Check the issue tracker to see if the bug has already been reported
- Collect information about the bug (steps to reproduce, expected vs. actual behavior)

When submitting a bug report, please include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected and actual behavior
- Screenshots if applicable
- Environment details (OS, browser, etc.)

### Suggesting Features

When suggesting features:

- Provide a clear description of the feature
- Explain why this feature would benefit the project
- Include any relevant examples or mockups

### Pull Requests

For pull requests:

1. Fork the repository
2. Create a new branch for your feature/bugfix
3. Write clear, well-documented code
4. Add tests when applicable
5. Ensure your code follows the project's style guidelines
6. Submit a pull request with a clear description of the changes

## Development Setup

1. Fork and clone the repository
2. Install dependencies
3. Create a PostgreSQL database and update the .env file
4. Run the development server

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Define proper interfaces and types
- Avoid using any type when possible

### React

- Use functional components with hooks
- Keep components small and focused on a single responsibility
- Use proper prop typing

### Testing

- Write tests for new features
- Ensure existing tests pass before submitting

## Git Workflow

- Create a feature branch from main
- Use descriptive commit messages
- Reference issue numbers in commits when applicable
- Keep pull requests focused on a single change

## Database Changes

- Use Drizzle migrations for schema changes
- Document any changes to the database schema

## License

By contributing to IntroConnect, you agree that your contributions will be licensed under the same [GPL-3.0 License](LICENSE.md) that covers the project.

Thank you for helping make IntroConnect better!
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TEMPLATES = exports.DOC_SET = void 0;
exports.DOC_SET = [
    "README.md",
    "CLAUDE.md",
    "architecture.md",
    "workflow.md",
    "troubleshooting.md",
];
const README = `# <Project Name>

<!-- One or two sentences: what this project does and who it is for. -->

## Features

<!-- Bullet list of the main capabilities. -->

## Installation

<!-- How to install / set up, using the project's actual package manager. -->

## Usage

<!-- A minimal example of running or using the project. -->

## Project Structure

<!-- Short description of the top-level directories. -->

## Configuration

<!-- Environment variables / settings, if any. -->

## Development

<!-- How to build, test, and run locally. -->

## License
`;
const CLAUDE = `# CLAUDE.md

Guidance for AI coding agents working in this repository.

## Project overview

<!-- What this project is, in 2-3 sentences. -->

## Tech stack

<!-- Languages, frameworks, key libraries. -->

## Commands

<!-- Build, test, lint, and run commands the agent should use. -->

## Conventions

<!-- Code style, patterns, and directory conventions to follow. -->

## Things to avoid

<!-- Known footguns and do-nots. -->
`;
const ARCHITECTURE = `# Architecture

## Overview

<!-- High-level description of how the system is structured. -->

## Components

<!-- The major modules/packages and their responsibilities. -->

## Data flow

<!-- How a typical request / operation flows through the components. -->

## External dependencies

<!-- Databases, services, and APIs the system relies on. -->

## Key design decisions

<!-- Notable trade-offs and why they were made (mark TODO if unknown). -->
`;
const WORKFLOW = `# Development Workflow

## Prerequisites

<!-- Tools and versions needed. -->

## Setup

<!-- Steps to get a working dev environment. -->

## Common tasks

<!-- Build, test, run, debug — the day-to-day commands. -->

## Branching & commits

<!-- Branching model and commit conventions, if any. -->

## Release / deployment

<!-- How changes ship (mark TODO if unknown). -->
`;
const TROUBLESHOOTING = `# Troubleshooting

<!-- Common problems and their fixes. For each: symptom, cause, solution. -->

## <Problem>

**Symptom:**

**Cause:**

**Fix:**
`;
exports.DEFAULT_TEMPLATES = {
    "README.md": README,
    "CLAUDE.md": CLAUDE,
    "architecture.md": ARCHITECTURE,
    "workflow.md": WORKFLOW,
    "troubleshooting.md": TROUBLESHOOTING,
};
//# sourceMappingURL=templates.js.map
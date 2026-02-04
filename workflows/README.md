# Workflows Directory

This directory contains markdown SOPs (Standard Operating Procedures) that define:
- **Objective**: What the workflow accomplishes
- **Required Inputs**: What data/parameters are needed
- **Tools to Use**: Which scripts in `tools/` to execute
- **Expected Outputs**: What gets generated
- **Edge Cases**: How to handle failures and exceptions

## Creating a New Workflow

Each workflow should be a markdown file that follows this structure:

```markdown
# Workflow Name

## Objective
Clear statement of what this workflow accomplishes.

## Required Inputs
- Input 1: Description
- Input 2: Description

## Tools Required
- `tools/script_name.py`: What it does

## Steps
1. First step
2. Second step
3. Third step

## Expected Outputs
- Output 1: Description and location
- Output 2: Description and location

## Edge Cases & Error Handling
- Case 1: How to handle
- Case 2: How to handle

## Notes
Any learnings, rate limits, timing considerations, etc.
```

## Existing Workflows

*(Workflows will be added here as they are created)*

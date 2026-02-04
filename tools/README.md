# Tools Directory

This directory contains Python scripts that perform deterministic execution. Each tool should:
- Do **one thing well**
- Accept clear inputs (CLI args or config)
- Return consistent outputs
- Handle errors gracefully
- Be independently testable

## Tool Guidelines

**Structure:**
```python
#!/usr/bin/env python3
"""
Brief description of what this tool does.
"""

import argparse
import os
from dotenv import load_dotenv

def main():
    """Main execution function."""
    # Your logic here
    pass

if __name__ == "__main__":
    load_dotenv()  # Load environment variables
    main()
```

**Best Practices:**
- Use type hints
- Add docstrings
- Load secrets from environment variables
- Log progress and errors
- Exit with appropriate status codes (0 = success, non-zero = failure)

## Existing Tools

*(Tools will be listed here as they are created)*

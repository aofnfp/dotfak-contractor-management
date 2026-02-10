FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (includes WeasyPrint deps)
RUN apt-get update && apt-get install -y \
    gcc \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Add cache busting argument
ARG CACHEBUST=1

# Prevent Python from writing bytecode (.pyc files)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy the entire project
COPY . .

# Remove all Python cache to ensure fresh code
RUN find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
RUN find . -type f -name "*.pyc" -delete 2>/dev/null || true

# Expose port
EXPOSE 8000

# Start command
CMD ["sh", "-c", "cd backend && uvicorn main:app --host 0.0.0.0 --port 8000"]

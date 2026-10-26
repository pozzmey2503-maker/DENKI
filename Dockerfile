# Use official lightweight Python 3.11 base image
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging for Cloud streams (Render, Hugging Face, etc.)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=3000 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Set working directory
WORKDIR /app

# Install essential system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for Docker layer caching
COPY requirements.txt .

# Upgrade pip and install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Install Playwright Chromium headless browser with full system OS dependencies
RUN playwright install --with-deps chromium

# Ensure browser binaries are accessible by any user (crucial for Hugging Face Spaces non-root user 1000)
RUN chmod -R 777 /ms-playwright

# Copy full application code
COPY . .

# Ensure application files have read/write access
RUN chmod -R 777 /app

# Expose default container port
EXPOSE 3000

# Final command to launch DenKi server
CMD ["python", "serve.py"]

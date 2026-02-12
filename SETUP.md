# Paystub Extractor - Setup Guide

Complete setup guide for the Paystub Extractor system.

## System Overview

The Paystub Extractor uses the **WAT framework** (Workflows, Agents, Tools):

- **Workflows**: [workflows/extract_paystub_data.md](workflows/extract_paystub_data.md) defines the process
- **Tools**: Python scripts in `tools/` handle PDF extraction and parsing
- **Backend API**: FastAPI server provides REST API
- **Database**: PostgreSQL stores paystubs as JSON
- **Frontend**: Web interface for upload and display

## Prerequisites

- Python 3.8+
- PostgreSQL 12+ (with JSONB support)
- pip (Python package manager)
- (Optional) Node.js for frontend development

## Installation Steps

### 1. Clone/Navigate to Project

```bash
cd "/Users/abrahamoladotun/Documents/Paystub Extractor"
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `pdfplumber` - PDF text extraction
- `fastapi` & `uvicorn` - Backend API server
- `psycopg2-binary` - PostgreSQL adapter
- `python-dotenv` - Environment variable management

### 3. Set Up PostgreSQL Database

#### Option A: Local PostgreSQL

Install PostgreSQL:
```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb paystub_extractor
```

#### Option B: Cloud PostgreSQL

Use a cloud provider like:
- **Supabase** (https://supabase.com) - Free tier available
- **Railway** (https://railway.app)
- **Heroku Postgres**
- **AWS RDS**

### 4. Configure Environment Variables

Create `.env` file in project root:

```bash
# Database connection
DATABASE_URL=postgresql://username:password@localhost:5432/paystub_extractor

# Or for cloud:
# DATABASE_URL=postgresql://user:pass@host.region.provider.com:5432/dbname

# Optional: API configuration
API_HOST=0.0.0.0
API_PORT=8000
```

**Important:** Never commit `.env` to version control (already in `.gitignore`)

### 5. Initialize Database Schema

Run the database setup script:

```bash
python tools/setup_database.py
```

This creates:
- `paystubs` table with JSONB field
- Indexes for efficient querying
- Triggers for auto-updating timestamps

Verify:
```bash
# Connect to database
psql paystub_extractor

# List tables
\dt

# View schema
\d paystubs
```

## Usage

### Command-Line Tools

#### 1. Extract PDF Text (Testing)

```bash
python tools/extract_pdf_text.py SampleData/Payslip_to_Print_02_04_2026.pdf -o .tmp/output.txt --print
```

#### 2. Parse Paystub PDF

```bash
python tools/parse_paystub.py \
  SampleData/Payslip_to_Print_02_04_2026.pdf \
  ap_account_services \
  -o .tmp/parsed.json \
  --print
```

**Output:** JSON file with structured paystub data

#### 3. Save to Database

```bash
python tools/save_paystub_to_db.py .tmp/parsed.json
```

This saves all paystubs from the JSON file to the database.

### Backend API Server

#### Start the Server

```bash
cd backend
python main.py
```

Or with uvicorn directly:
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

#### API Endpoints

**Interactive Documentation:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

**Key Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/organizations` | GET | List supported organizations |
| `/upload` | POST | Upload and parse PDF |
| `/paystubs/save` | POST | Save paystubs to database |
| `/paystubs` | GET | Query paystubs (with filters) |
| `/paystubs/{id}` | GET | Get single paystub |

**Example API Calls:**

```bash
# Upload and parse
curl -X POST "http://localhost:8000/upload" \
  -F "file=@SampleData/Payslip_to_Print_02_04_2026.pdf" \
  -F "organization=ap_account_services"

# Query paystubs
curl "http://localhost:8000/paystubs?start_date=2025-01-01&end_date=2025-12-31"

# Get specific paystub
curl "http://localhost:8000/paystubs/1"
```

## Frontend Development

### Quick Start HTML Interface

Create `frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Paystub Extractor</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 p-8">
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold mb-8">Paystub Extractor</h1>

        <!-- Upload Section -->
        <div class="bg-white p-6 rounded-lg shadow mb-8">
            <h2 class="text-xl font-semibold mb-4">Upload Paystub</h2>
            <form id="uploadForm" enctype="multipart/form-data">
                <div class="mb-4">
                    <label class="block mb-2">PDF File:</label>
                    <input type="file" name="file" accept=".pdf" required
                           class="border p-2 rounded w-full">
                </div>
                <div class="mb-4">
                    <label class="block mb-2">Organization:</label>
                    <select name="organization" required class="border p-2 rounded w-full">
                        <option value="ap_account_services">AP Account Services</option>
                    </select>
                </div>
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Upload & Parse
                </button>
            </form>
            <div id="result" class="mt-4"></div>
        </div>

        <!-- Display Section -->
        <div class="bg-white p-6 rounded-lg shadow">
            <h2 class="text-xl font-semibold mb-4">Recent Paystubs</h2>
            <div id="paystubList"></div>
        </div>
    </div>

    <script>
        const API_BASE = 'http://localhost:8000';

        // Handle upload
        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const result = document.getElementById('result');

            result.innerHTML = '<p class="text-blue-600">Processing...</p>';

            try {
                const response = await fetch(`${API_BASE}/upload`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    result.innerHTML = `<p class="text-green-600">✓ Extracted ${data.paystubs_count} paystub(s)</p>`;
                    loadPaystubs(); // Refresh list
                } else {
                    result.innerHTML = `<p class="text-red-600">Error: ${data.message}</p>`;
                }
            } catch (error) {
                result.innerHTML = `<p class="text-red-600">Error: ${error.message}</p>`;
            }
        });

        // Load paystubs
        async function loadPaystubs() {
            try {
                const response = await fetch(`${API_BASE}/paystubs?limit=10`);
                const data = await response.json();

                const list = document.getElementById('paystubList');

                if (data.paystubs && data.paystubs.length > 0) {
                    list.innerHTML = data.paystubs.map(p => `
                        <div class="border-b py-3">
                            <div class="font-semibold">${p.employee_name}</div>
                            <div class="text-sm text-gray-600">
                                ${p.pay_period_begin} to ${p.pay_period_end}
                            </div>
                            <div class="text-sm">
                                Gross: $${p.gross_pay?.toFixed(2)} |
                                Net: $${p.net_pay?.toFixed(2)}
                            </div>
                        </div>
                    `).join('');
                } else {
                    list.innerHTML = '<p class="text-gray-500">No paystubs found</p>';
                }
            } catch (error) {
                console.error('Failed to load paystubs:', error);
            }
        }

        // Load on page load
        loadPaystubs();
    </script>
</body>
</html>
```

Open in browser: `frontend/index.html`

### Production Frontend

For production, use a modern framework:
- **React** with Tailwind CSS
- **Vue.js** with Vuetify
- **Next.js** for SSR

## Adding New Organization Parsers

When you receive a paystub from a new organization:

### 1. Create New Parser

```bash
cp tools/parsers/ap_account_services_parser.py tools/parsers/new_org_parser.py
```

### 2. Update Parser Code

Edit `tools/parsers/new_org_parser.py`:
- Update `self.organization` name
- Modify regex patterns to match new format
- Test with sample PDF

### 3. Register Parser

Edit `tools/parsers/__init__.py`:

```python
AVAILABLE_PARSERS = {
    "ap_account_services": "ap_account_services_parser",
    "new_org": "new_org_parser",  # Add this
}
```

### 4. Test

```bash
python tools/parse_paystub.py sample.pdf new_org -o test.json --print
```

## Testing

### Unit Tests

```bash
# Test PDF extraction
python tools/extract_pdf_text.py SampleData/Payslip_to_Print_02_04_2026.pdf --print

# Test parsing
python tools/parse_paystub.py SampleData/Payslip_to_Print_02_04_2026.pdf ap_account_services --validate-only
```

### Integration Test

Complete end-to-end test:

```bash
# 1. Parse PDF
python tools/parse_paystub.py SampleData/Payslip_to_Print_02_04_2026.pdf ap_account_services -o .tmp/test.json

# 2. Save to database
python tools/save_paystub_to_db.py .tmp/test.json

# 3. Query via API
curl "http://localhost:8000/paystubs?limit=5"
```

## Deployment

### Backend Deployment

**Options:**
1. **Railway** - `railway up` (easiest)
2. **Heroku** - Create `Procfile`: `web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
3. **AWS EC2** - Use systemd service
4. **Docker** - Create Dockerfile

### Database Hosting

Use managed PostgreSQL:
- **Supabase** (recommended for beginners)
- **Railway**
- **AWS RDS**

### Frontend Hosting

- **Coolify** (self-hosted VPS, Docker)
- **Vercel** (for Next.js/React)
- **GitHub Pages** (simple HTML)

## Troubleshooting

### PDF Extraction Issues

**Problem:** No text extracted from PDF

**Solution:** PDF may be scanned image. Install Tesseract OCR:
```bash
brew install tesseract  # macOS
pip install pytesseract Pillow
```

### Database Connection Errors

**Problem:** `could not connect to server`

**Solutions:**
- Check PostgreSQL is running: `brew services list`
- Verify connection string in `.env`
- Check firewall settings

### Parser Not Finding Data

**Problem:** All fields empty or incorrect

**Solutions:**
- Check PDF text format: `python tools/extract_pdf_text.py file.pdf --print`
- Compare with expected format
- Adjust regex patterns in parser
- Create new organization parser if format is different

## File Structure Reference

```
Paystub Extractor/
├── .tmp/                    # Temporary files (gitignored)
├── backend/                 # FastAPI backend
│   └── main.py             # API server
├── frontend/               # Web interface
│   └── index.html          # Simple HTML frontend
├── SampleData/             # Sample paystub PDFs
├── tools/                  # Python tools
│   ├── parsers/            # Organization-specific parsers
│   │   ├── __init__.py
│   │   └── ap_account_services_parser.py
│   ├── extract_pdf_text.py
│   ├── parse_paystub.py
│   ├── setup_database.py
│   └── save_paystub_to_db.py
├── workflows/              # Process documentation
│   └── extract_paystub_data.md
├── .env                    # Environment variables (gitignored)
├── .env.template           # Template for .env
├── .gitignore
├── CLAUDE.md               # Agent instructions
├── README.md               # Project overview
├── requirements.txt        # Python dependencies
└── SETUP.md               # This file
```

## Next Steps

1. **Set up environment** - Install dependencies and configure database
2. **Test with sample** - Run command-line tools with provided sample
3. **Start backend** - Launch API server
4. **Build frontend** - Create web interface
5. **Add organizations** - Create parsers for other paystub formats
6. **Deploy** - Host on cloud platform

## Support

For issues or questions:
1. Check [workflows/extract_paystub_data.md](workflows/extract_paystub_data.md) for detailed process
2. Review tool README files in `tools/` directory
3. Check API documentation at http://localhost:8000/docs

## Security Notes

- Never commit `.env` or credentials files
- Use environment variables for all secrets
- Sanitize uploaded files (check file types, sizes)
- Implement authentication for production
- Use HTTPS in production
- Implement rate limiting on API endpoints
- Validate all user inputs

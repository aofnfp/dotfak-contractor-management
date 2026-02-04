# Paystub Extractor

A complete system for extracting paystub data from PDF files, storing in a PostgreSQL database, and displaying via a web interface.

## Features

✅ **PDF Extraction** - Extract text from multi-page paystub PDFs
✅ **Regex-Based Parsing** - Extract all fields using regex patterns
✅ **Multi-Organization Support** - Extensible parser system for different paystub formats
✅ **JSON Storage** - Store complete paystub data as JSON in PostgreSQL
✅ **REST API** - FastAPI backend with OpenAPI documentation
✅ **Web Interface** - Upload PDFs and view paystubs with filtering
✅ **WAT Framework** - Built on Workflows, Agents, Tools architecture

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up Database

```bash
# Create .env file
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/paystub_extractor" > .env

# Initialize database schema
python tools/setup_database.py
```

### 3. Test with Sample Data

```bash
# Parse sample PDF
python tools/parse_paystub.py \
  SampleData/Payslip_to_Print_02_04_2026.pdf \
  ap_account_services \
  -o .tmp/output.json \
  --print

# Save to database
python tools/save_paystub_to_db.py .tmp/output.json
```

### 4. Start Backend API

```bash
cd backend
python main.py

# API docs at: http://localhost:8000/docs
```

### 5. Open Frontend

```bash
open frontend/index.html
```

## Project Structure

```
Paystub Extractor/
├── backend/                    # FastAPI REST API
│   └── main.py
├── frontend/                   # Web interface
│   └── index.html
├── tools/                      # Python extraction/parsing tools
│   ├── parsers/                # Organization-specific parsers
│   │   ├── ap_account_services_parser.py
│   │   └── __init__.py
│   ├── extract_pdf_text.py     # PDF → text extraction
│   ├── parse_paystub.py        # Text → structured JSON
│   ├── setup_database.py       # Database initialization
│   └── save_paystub_to_db.py   # Save JSON to database
├── workflows/                  # Process documentation (WAT framework)
│   └── extract_paystub_data.md
├── SampleData/                 # Sample paystub PDFs
├── CLAUDE.md                   # Agent instructions (WAT framework)
├── SETUP.md                    # Complete setup guide
└── README.md                   # This file
```

## How It Works

### WAT Framework Architecture

This project uses the **WAT framework** (Workflows, Agents, Tools):

1. **Workflows** ([workflows/extract_paystub_data.md](workflows/extract_paystub_data.md)) - Documents the complete process
2. **Agents** (AI) - Coordinate and make decisions
3. **Tools** (Python scripts) - Execute deterministic operations

### Data Flow

```
PDF Upload → Text Extraction → Regex Parsing → JSON Storage → Web Display
     ↓              ↓                ↓              ↓             ↓
pdfplumber    extract_pdf_text   ap_account_    PostgreSQL    FastAPI
                                 services_       (JSONB)       + HTML
                                 parser.py
```

### Database Schema

Paystubs stored with key fields extracted for filtering + complete JSON:

```sql
CREATE TABLE paystubs (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50),
    employee_name VARCHAR(255),
    organization VARCHAR(100),
    pay_period_begin DATE,
    pay_period_end DATE,
    check_date DATE,
    net_pay NUMERIC(10,2),
    gross_pay NUMERIC(10,2),
    paystub_data JSONB,  -- Complete paystub as JSON
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/organizations` | GET | List supported organizations |
| `/upload` | POST | Upload & parse PDF |
| `/paystubs` | GET | Query paystubs (with filters) |
| `/paystubs/{id}` | GET | Get single paystub |
| `/paystubs/save` | POST | Save paystubs to database |

**Interactive Docs:** http://localhost:8000/docs

## Adding New Organizations

When you receive paystubs from a new organization:

1. **Create parser file:**
   ```bash
   cp tools/parsers/ap_account_services_parser.py \
      tools/parsers/new_org_parser.py
   ```

2. **Update regex patterns** to match new format

3. **Register parser** in `tools/parsers/__init__.py`:
   ```python
   AVAILABLE_PARSERS = {
       "ap_account_services": "ap_account_services_parser",
       "new_org": "new_org_parser",  # Add here
   }
   ```

4. **Test:**
   ```bash
   python tools/parse_paystub.py sample.pdf new_org -o test.json
   ```

## Documentation

- **[SETUP.md](SETUP.md)** - Complete installation and deployment guide
- **[workflows/extract_paystub_data.md](workflows/extract_paystub_data.md)** - Detailed workflow documentation
- **[CLAUDE.md](CLAUDE.md)** - WAT framework overview
- **API Docs** - http://localhost:8000/docs (when server running)

## Features by Component

### PDF Extraction (`extract_pdf_text.py`)
- Multi-page PDF support
- Preserves layout for regex matching
- Page-by-page extraction
- Text-based PDFs (OCR support optional)

### Parsing (`ap_account_services_parser.py`)
- Extracts 50+ fields per paystub
- Handles optional fields gracefully
- Supports multi-page documents with multiple pay periods
- Validates extracted data

### Backend API (`backend/main.py`)
- RESTful API with FastAPI
- File upload and processing
- Database querying with filters
- CORS support for frontend
- OpenAPI/Swagger documentation

### Database
- PostgreSQL with JSONB support
- Indexed for fast queries
- Auto-updating timestamps
- Prevents duplicate paystubs
- Complete data preservation in JSON

## Sample Data

The project includes 27 sample paystubs from AP Account Services LLC (Jan 2025 - Jan 2026) in `SampleData/Payslip_to_Print_02_04_2026.pdf`.

**Extracted fields include:**
- Employee information
- Pay period dates
- Earnings breakdown (Regular, Overtime, Bonuses, etc.)
- Taxes (OASDI, Medicare)
- Pre-tax deductions (401k)
- Post-tax deductions
- Employer benefits
- Payment information (bank accounts)
- Tax filing status

## Requirements

- Python 3.8+
- PostgreSQL 12+ (with JSONB)
- pdfplumber
- FastAPI & uvicorn
- psycopg2

See [requirements.txt](requirements.txt) for complete list.

## Testing

```bash
# Test PDF extraction
python tools/extract_pdf_text.py SampleData/Payslip_to_Print_02_04_2026.pdf --print

# Test parsing
python tools/parse_paystub.py SampleData/Payslip_to_Print_02_04_2026.pdf ap_account_services --validate-only

# Test end-to-end
python tools/parse_paystub.py SampleData/Payslip_to_Print_02_04_2026.pdf ap_account_services -o .tmp/test.json
python tools/save_paystub_to_db.py .tmp/test.json
```

## License

See project documentation for license information.

## Support

For detailed setup instructions, see [SETUP.md](SETUP.md)

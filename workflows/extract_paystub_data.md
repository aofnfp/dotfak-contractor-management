# Extract Paystub Data Workflow

## Objective
Extract all paystub information from PDF files, store in JSON format, and present via a filterable web interface. The system must be extensible to support multiple organization paystub formats.

## Required Inputs
- PDF file containing paystub(s) (may be multi-page with multiple pay periods)
- Organization identifier (e.g., "ap_account_services", "organization_2", etc.)

## Architecture Overview

### Data Storage Strategy
- **Single JSON field per paystub record** in database
- Each JSON document contains complete paystub information
- Benefits:
  - No schema changes when adding new organizations
  - Flexible field structure per organization
  - Easy to query and filter by date ranges
  - Complete audit trail of original data

### Organization-Specific Parsers
- Each organization has its own regex pattern set
- Pattern sets stored in `tools/parsers/` directory
- Easy to add new organizations without modifying core logic

## Tools Required

### 1. `tools/extract_pdf_text.py`
**Purpose:** Convert PDF to text for regex processing

**Inputs:**
- `pdf_path`: Path to paystub PDF file
- `output_path`: Optional path for extracted text (for debugging)

**Outputs:**
- Raw text content from PDF
- Preserves line breaks and spacing for regex matching

**Dependencies:**
- `PyPDF2` or `pdfplumber` (pdfplumber recommended for better text extraction)

### 2. `tools/parsers/ap_account_services_parser.py`
**Purpose:** Parse AP Account Services paystub format using regex

**Key Fields to Extract:**

#### Header Information
- Company name and address
- Employee name
- Employee ID
- Pay period begin/end dates
- Check date
- Check number

#### Summary Data
- Gross pay (current & YTD)
- Pre-tax deductions (current & YTD)
- Employee taxes (current & YTD)
- Deductions (current & YTD)
- Net pay (current & YTD)

#### Earnings Breakdown (arrays of line items)
- Description (Regular, Overtime, Overtime Premium, Education Differential, Holiday, Vacation, Bonuses, etc.)
- Dates (if present)
- Hours worked
- Rate
- Amount (current)
- YTD amount

#### Taxes Breakdown
- OASDI (current & YTD)
- Medicare (current & YTD)
- Any state/local taxes

#### Pre-Tax Deductions
- 401(k) contributions
- Other pre-tax items

#### Deductions
- Post-tax deductions (United Way, etc.)
- Fringe offsets

#### Employer Benefits
- 401(k) matching
- Insurance (Life, AD&D, Disability)
- Health benefits

#### Taxable Wages
- OASDI taxable wages
- Medicare taxable wages
- Federal withholding taxable wages

#### Tax Information
- Marital status
- Allowances (federal & state)
- Additional withholding

#### Payment Information (array)
- Bank name
- Account number (masked)
- Payment amounts

**Outputs:**
- Structured dictionary with all extracted data
- Metadata including extraction timestamp and parser version

### 3. `tools/parse_paystub.py`
**Purpose:** Main orchestration script that coordinates extraction and parsing

**Flow:**
1. Accept PDF file path and organization identifier
2. Call `extract_pdf_text.py` to get raw text
3. Load appropriate parser based on organization
4. Parse text using organization-specific regex patterns
5. Validate extracted data (ensure required fields present)
6. Generate JSON output
7. Store in `.tmp/` for review or directly to database

**Inputs:**
- `pdf_path`: Path to PDF file
- `organization`: Organization identifier (e.g., "ap_account_services")
- `--output-json`: Optional path to save JSON output
- `--validate-only`: Flag to validate without saving

**Outputs:**
- Complete JSON document with all paystub data
- Status code (0 = success, non-zero = error)
- Error messages if extraction fails

### 4. `tools/save_paystub_to_db.py`
**Purpose:** Save parsed paystub JSON to database

**Inputs:**
- JSON data (from parse_paystub.py)
- Database connection string (from .env)

**Database Schema:**
```sql
CREATE TABLE paystubs (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50),
    employee_name VARCHAR(255),
    organization VARCHAR(100),
    pay_period_begin DATE,
    pay_period_end DATE,
    check_date DATE,
    net_pay DECIMAL(10,2),
    gross_pay DECIMAL(10,2),
    paystub_data JSONB,  -- Complete paystub as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_paystubs_employee ON paystubs(employee_id);
CREATE INDEX idx_paystubs_check_date ON paystubs(check_date);
CREATE INDEX idx_paystubs_pay_period ON paystubs(pay_period_begin, pay_period_end);
CREATE INDEX idx_paystubs_organization ON paystubs(organization);
```

**Outputs:**
- Database record ID
- Success/failure status

## Frontend Requirements

### Upload Interface
- Drag-and-drop file upload
- Organization selector dropdown
- Progress indicator during processing
- Success/error messaging
- Display extracted data for review before saving

### Display Interface
- **Filter Controls:**
  - Date range picker (filter by check date or pay period)
  - Organization filter (if multiple employers)
  - Search by employee name/ID

- **List View:**
  - Card-based layout showing paystub summaries
  - Each card shows: pay period, check date, gross pay, net pay
  - Click to expand full details

- **Detail View:**
  - Clean presentation of all paystub data
  - Organized sections matching paystub structure
  - Earnings table
  - Taxes table
  - Deductions table
  - Benefits table
  - Payment information
  - Export button (download as PDF or JSON)

### Technology Stack
- **Backend:** Python Flask or FastAPI
- **Frontend:** React or Vue.js with Tailwind CSS
- **Database:** PostgreSQL (for JSONB support)
- **PDF Processing:** pdfplumber

## Steps to Execute

### Initial Setup
1. Install dependencies: `pip install -r requirements.txt`
2. Set up database (run migration script)
3. Configure `.env` with database credentials

### Processing a New Paystub
1. User uploads PDF via web interface
2. User selects organization from dropdown
3. Backend calls `parse_paystub.py` with PDF and organization
4. Extracted data displayed for user review
5. User confirms, backend calls `save_paystub_to_db.py`
6. Success message shown, user redirected to list view

### Adding a New Organization
1. Create new parser file: `tools/parsers/{organization}_parser.py`
2. Implement regex patterns for that organization's format
3. Follow the same field structure as `ap_account_services_parser.py`
4. Test with sample paystub
5. Add organization to dropdown in frontend

## Expected Outputs

### JSON Structure Example
```json
{
  "metadata": {
    "organization": "ap_account_services",
    "parser_version": "1.0",
    "extracted_at": "2026-01-30T10:00:00Z",
    "source_file": "Payslip_to_Print_02_04_2026.pdf"
  },
  "header": {
    "company": {
      "name": "AP Account Services LLC",
      "address": "9311 San Pedro Ave Suite 600, San Antonio, TX 78216"
    },
    "employee": {
      "name": "Abraham Oladotun",
      "id": "000074267"
    },
    "pay_period": {
      "begin": "2025-01-26",
      "end": "2025-02-08"
    },
    "check_date": "2025-02-14",
    "check_number": null
  },
  "summary": {
    "current": {
      "gross_pay": 711.03,
      "pre_tax_deductions": 0.00,
      "employee_taxes": 54.39,
      "deductions": 0.00,
      "net_pay": 656.64
    },
    "ytd": {
      "gross_pay": 711.03,
      "pre_tax_deductions": 0.00,
      "employee_taxes": 54.39,
      "deductions": 0.00,
      "net_pay": 656.64
    }
  },
  "earnings": [
    {
      "description": "Regular",
      "dates": "02/03/2025-02/08/2025",
      "hours": 40.0,
      "rate": 16.0,
      "amount": 640.00,
      "ytd": 640.00
    },
    {
      "description": "Overtime",
      "dates": "02/03/2025-02/08/2025",
      "hours": 0.42,
      "rate": 16.0,
      "amount": 6.72,
      "ytd": 6.72
    }
  ],
  "taxes": [
    {
      "description": "OASDI",
      "amount": 44.08,
      "ytd": 44.08
    },
    {
      "description": "Medicare",
      "amount": 10.31,
      "ytd": 10.31
    }
  ],
  "pre_tax_deductions": [],
  "deductions": [],
  "employer_benefits": [],
  "taxable_wages": [
    {
      "description": "OASDI - Taxable Wages",
      "amount": 711.03,
      "ytd": 711.03
    }
  ],
  "tax_info": {
    "marital_status": "Single or Married filing separately",
    "federal_allowances": 0,
    "state_allowances": 0,
    "additional_withholding": 0
  },
  "payment_info": [
    {
      "bank": "Lead Bank",
      "account_name": "Lead Bank",
      "account_number": "******5257",
      "amount": 150.11,
      "currency": "USD"
    },
    {
      "bank": "Chase Bank",
      "account_name": "Chase B.",
      "account_number": "******9058",
      "amount": 506.53,
      "currency": "USD"
    }
  ]
}
```

## Edge Cases & Error Handling

### Multi-Page PDFs
- Some PDFs contain multiple pay periods (like the sample)
- Parser should detect page breaks and extract each paystub separately
- Return array of paystub objects

### Missing Fields
- Not all paystubs have all fields (e.g., no bonuses, no deductions)
- Parser should handle optional fields gracefully
- Include null/empty arrays for missing sections

### OCR Requirement
- If PDF is scanned image (not text-based), OCR needed
- Add `tools/ocr_pdf.py` using Tesseract
- Workflow checks if PDF is text-based, falls back to OCR if needed

### Validation Failures
- If critical fields missing (employee name, dates, net pay), flag for manual review
- Store in separate table or mark with validation_status field
- Admin interface to review and correct

## Testing Strategy

1. **Unit Tests:** Test each regex pattern individually
2. **Integration Tests:** Process complete sample paystub
3. **Edge Case Tests:** Test with missing fields, bonus periods, etc.
4. **Performance Tests:** Process multi-page PDFs with 10+ paystubs

## Notes & Learnings
- AP Account Services format is consistent across pay periods
- Some fields appear/disappear based on pay period (e.g., bonuses, holiday pay)
- YTD values reset at start of calendar year
- Check numbers not always present
- Payment can split across multiple banks
- Group Term Life (GTL) appears as earnings line item with $0 hours

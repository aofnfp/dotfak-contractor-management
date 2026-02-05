/**
 * Export Utilities
 *
 * Functions for exporting data to CSV format for accounting and reporting
 */

/**
 * Convert array of objects to CSV string
 */
export function jsonToCSV<T extends Record<string, any>>(
  data: T[],
  headers: { key: keyof T; label: string }[]
): string {
  if (!data || data.length === 0) {
    return headers.map(h => h.label).join(',')
  }

  // Create header row
  const headerRow = headers.map(h => h.label).join(',')

  // Create data rows
  const dataRows = data.map(item => {
    return headers
      .map(h => {
        const value = item[h.key]

        // Handle null/undefined
        if (value === null || value === undefined) {
          return '""'
        }

        // Handle dates
        if (value && typeof value === 'object' && 'toISOString' in value) {
          return `"${(value as Date).toISOString().split('T')[0]}"`
        }

        // Handle numbers
        if (typeof value === 'number') {
          return value.toString()
        }

        // Handle strings (escape quotes and wrap in quotes if contains comma)
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }

        return stringValue
      })
      .join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Trigger CSV download in browser
 */
export function downloadCSV(csv: string, filename: string) {
  // Add timestamp to filename
  const timestamp = new Date().toISOString().split('T')[0]
  const fullFilename = `${filename}_${timestamp}.csv`

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', fullFilename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

/**
 * Export data to CSV file
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  headers: { key: keyof T; label: string }[],
  filename: string
) {
  const csv = jsonToCSV(data, headers)
  downloadCSV(csv, filename)
}

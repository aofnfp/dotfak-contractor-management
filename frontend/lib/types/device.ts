/**
 * Device Types
 *
 * TypeScript interfaces for device registry data
 */

export type DeviceType = 'laptop' | 'router' | 'phone' | 'tablet' | 'other'
export type DeviceStatus = 'received' | 'delivered' | 'in_use' | 'returned' | 'lost'

export interface Device {
  id: string
  contractor_assignment_id: string
  manager_assignment_id?: string
  device_type: DeviceType
  brand?: string
  model?: string
  serial_number?: string
  status: DeviceStatus
  credentials?: Record<string, string>
  received_date?: string
  delivered_date?: string
  returned_date?: string
  notes?: string
  created_at: string
  updated_at?: string
  // Enriched
  contractor_name?: string
  client_name?: string
  manager_name?: string
}

export interface CreateDeviceRequest {
  contractor_assignment_id: string
  manager_assignment_id?: string
  device_type: DeviceType
  brand?: string
  model?: string
  serial_number?: string
  status?: DeviceStatus
  credentials?: Record<string, string>
  received_date?: string
  delivered_date?: string
  notes?: string
}

export interface UpdateDeviceRequest {
  device_type?: DeviceType
  brand?: string
  model?: string
  serial_number?: string
  status?: DeviceStatus
  credentials?: Record<string, string>
  received_date?: string
  delivered_date?: string
  returned_date?: string
  notes?: string
}

import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('../src/shared/lib/firebase', () => ({
  auth: {},
  db: {},
  functions: {},
  app: {},
}))

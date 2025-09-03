import { vi } from 'vitest'

declare global {
  const mockPush: ReturnType<typeof vi.fn>
  const mockReplace: ReturnType<typeof vi.fn>
  const mockPrefetch: ReturnType<typeof vi.fn>
  const mockBack: ReturnType<typeof vi.fn>
}

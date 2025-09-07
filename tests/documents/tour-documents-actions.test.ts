/**
 * @fileoverview Unit Tests for Tour Documents Server Actions
 * 
 * @description Tests for document management server actions including listing, uploading, downloading, and deleting
 * @coverage tour_documents server actions, validation, authorization, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  listTourDocuments, 
  createSignedDownloadURL, 
  updateDocumentTitle, 
  deleteTourDocument,
  uploadTourDocument 
} from '@/app/(shared)/documents/_actions';

// CONTEXT: Mock Supabase client for testing
const mockSelectQuery = {
  eq: vi.fn(() => ({
    order: vi.fn(() => ({
      data: [],
      error: null
    })),
    single: vi.fn(() => ({
      data: { role: 'agent' },
      error: null
    }))
  })),
  single: vi.fn(() => ({
    data: { role: 'agent' },
    error: null
  }))
};

const mockInsertQuery = {
  data: { id: 'test-doc-id' },
  error: null
};

const mockUpdateQuery = {
  eq: vi.fn(() => ({
    data: { id: 'test-doc-id' },
    error: null
  }))
};

const mockDeleteQuery = {
  eq: vi.fn(() => ({
    data: { id: 'test-doc-id' },
    error: null
  }))
};

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => mockSelectQuery),
    insert: vi.fn(() => mockInsertQuery),
    update: vi.fn(() => mockUpdateQuery),
    delete: vi.fn(() => mockDeleteQuery)
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(() => ({
        data: { path: 'test-path' },
        error: null
      })),
      createSignedUrl: vi.fn(() => ({
        data: { signedUrl: 'https://test-url.com' },
        error: null
      })),
      remove: vi.fn(() => ({
        data: null,
        error: null
      }))
    }))
  }
};

// CONTEXT: Mock createServerClient
vi.mock('@/lib/supabase-server', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient)
}));

// CONTEXT: Mock File object for upload tests
class MockFile {
  name: string;
  size: number;
  type: string;
  
  constructor(name: string, size: number, type: string) {
    this.name = name;
    this.size = size;
    this.type = type;
  }
  
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(1024));
  }
}

// CONTEXT: Make MockFile extend the real File class for instanceof checks
Object.setPrototypeOf(MockFile.prototype, File.prototype);
global.File = MockFile as any;

describe('Tour Documents Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listTourDocuments', () => {
    it('should list documents for employees', async () => {
      // CONTEXT: Mock authenticated user with employee role
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      const mockDocuments = [
        { id: 'doc-1', title: 'Itinerary', kind: 'itinerary' },
        { id: 'doc-2', title: 'Invoice', kind: 'invoice' }
      ];

      mockSelectQuery.eq.mockReturnValue({
        order: vi.fn(() => ({
          data: mockDocuments,
          error: null
        }))
      });

      const result = await listTourDocuments('123e4567-e89b-12d3-a456-426614174000', 'employee');
      
      expect(result).toEqual(mockDocuments);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tour_documents');
    });

    it('should filter to latest per kind for clients', async () => {
      // CONTEXT: Mock authenticated user with client role
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      const mockDocuments = [
        { id: 'doc-1', title: 'Old Itinerary', kind: 'itinerary', uploaded_at: '2024-01-01' },
        { id: 'doc-2', title: 'New Itinerary', kind: 'itinerary', uploaded_at: '2024-01-02' },
        { id: 'doc-3', title: 'Invoice', kind: 'invoice', uploaded_at: '2024-01-01' }
      ];

      mockSelectQuery.eq.mockReturnValue({
        order: vi.fn(() => ({
          data: mockDocuments,
          error: null
        }))
      });

      const result = await listTourDocuments('123e4567-e89b-12d3-a456-426614174000', 'client');
      
      // CONTEXT: Should only return latest per kind
      expect(result).toHaveLength(2);
      expect(result.find(doc => doc.kind === 'itinerary')?.title).toBe('New Itinerary');
      expect(result.find(doc => doc.kind === 'invoice')?.title).toBe('Invoice');
    });

    it('should throw error for unauthenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null }
      });

      await expect(listTourDocuments('123e4567-e89b-12d3-a456-426614174000', 'employee'))
        .rejects.toThrow();
    });
  });

  describe('createSignedDownloadURL', () => {
    it('should create signed URL for valid file path', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      const result = await createSignedDownloadURL('project/123/test.pdf');
      
      expect(result).toBe('https://test-url.com');
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('tour-docs');
    });

    it('should throw error for invalid file path', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        createSignedUrl: vi.fn(() => ({
          data: null,
          error: { message: 'File not found' }
        }))
      });

      await expect(createSignedDownloadURL('invalid/path'))
        .rejects.toThrow('File not found');
    });
  });

  describe('updateDocumentTitle', () => {
    it('should update document title successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      const result = await updateDocumentTitle('123e4567-e89b-12d3-a456-426614174000', 'New Title');
      
      expect(result).toEqual({ success: true });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tour_documents');
    });

    it('should throw error for invalid title', async () => {
      await expect(updateDocumentTitle('123e4567-e89b-12d3-a456-426614174000', ''))
        .rejects.toThrow();
    });
  });

  describe('deleteTourDocument', () => {
    it('should delete document successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      const result = await deleteTourDocument('123e4567-e89b-12d3-a456-426614174000');
      
      expect(result).toEqual({ success: true });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tour_documents');
    });

    it('should throw error for invalid document ID', async () => {
      await expect(deleteTourDocument(''))
        .rejects.toThrow();
    });
  });

  describe('uploadTourDocument', () => {
    it('should upload document successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      const mockFile = new File('test.pdf', 1024, 'application/pdf');
      
      const result = await uploadTourDocument({
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        file: mockFile,
        kind: 'itinerary',
        title: 'Test Document'
      });
      
      expect(result).toEqual({ success: true, documentId: 'test-doc-id' });
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('tour-docs');
    });

    it('should throw error for non-PDF file', async () => {
      const mockFile = new File('test.txt', 1024, 'text/plain');
      
      await expect(uploadTourDocument({
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        file: mockFile,
        kind: 'itinerary',
        title: 'Test Document'
      })).rejects.toThrow();
    });

    it('should throw error for file too large', async () => {
      const mockFile = new File('test.pdf', 11 * 1024 * 1024, 'application/pdf');
      
      await expect(uploadTourDocument({
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        file: mockFile,
        kind: 'itinerary',
        title: 'Test Document'
      })).rejects.toThrow();
    });
  });
});

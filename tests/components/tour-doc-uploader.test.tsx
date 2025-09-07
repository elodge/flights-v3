/**
 * @fileoverview Integration Tests for TourDocUploader Component
 * 
 * @description Tests for the document uploader component including drag-and-drop, file validation, and upload functionality
 * @coverage TourDocUploader component, file handling, validation, and user interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TourDocUploader } from '@/components/documents/TourDocUploader';

// CONTEXT: Mock server action
vi.mock('@/app/(shared)/documents/_actions', () => ({
  uploadTourDocument: vi.fn()
}));

// CONTEXT: Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// CONTEXT: Mock File object
global.File = class MockFile {
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
} as any;

describe('TourDocUploader Component', () => {
  const mockProps = {
    projectId: 'project-123',
    onUploadSuccess: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render upload interface', () => {
    render(<TourDocUploader {...mockProps} />);
    
    expect(screen.getByText('Upload Tour Documents')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop PDF files here, or click to browse')).toBeInTheDocument();
    expect(screen.getByText('Choose Files')).toBeInTheDocument();
  });

  it('should handle file selection via input', async () => {
    const user = userEvent.setup();
    render(<TourDocUploader {...mockProps} />);
    
    const fileInput = screen.getByRole('button', { name: /choose files/i });
    await user.click(fileInput);
    
    // CONTEXT: Simulate file selection
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('Files to Upload (1)')).toBeInTheDocument();
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
  });

  it('should handle drag and drop', async () => {
    render(<TourDocUploader {...mockProps} />);
    
    const dropZone = screen.getByText('Upload Tour Documents').closest('.border-dashed');
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    // CONTEXT: Simulate drag and drop
    fireEvent.dragOver(dropZone!, { dataTransfer: { files: [file] } });
    fireEvent.drop(dropZone!, { dataTransfer: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('Files to Upload (1)')).toBeInTheDocument();
    });
  });

  it('should validate file types', async () => {
    const user = userEvent.setup();
    render(<TourDocUploader {...mockProps} />);
    
    const fileInput = screen.getByRole('button', { name: /choose files/i });
    await user.click(fileInput);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const invalidFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    
    fireEvent.change(input, { target: { files: [invalidFile] } });
    
    // CONTEXT: Should not add invalid file to upload list
    expect(screen.queryByText('Files to Upload')).not.toBeInTheDocument();
  });

  it('should validate file size', async () => {
    const user = userEvent.setup();
    render(<TourDocUploader {...mockProps} />);
    
    const fileInput = screen.getByRole('button', { name: /choose files/i });
    await user.click(fileInput);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const largeFile = new File(['test content'], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 }); // 11MB
    
    fireEvent.change(input, { target: { files: [largeFile] } });
    
    // CONTEXT: Should not add oversized file to upload list
    expect(screen.queryByText('Files to Upload')).not.toBeInTheDocument();
  });

  it('should allow editing file metadata', async () => {
    const user = userEvent.setup();
    render(<TourDocUploader {...mockProps} />);
    
    // CONTEXT: Add a file first
    const fileInput = screen.getByRole('button', { name: /choose files/i });
    await user.click(fileInput);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('Files to Upload (1)')).toBeInTheDocument();
    });
    
    // CONTEXT: Edit document type
    const typeSelect = screen.getByDisplayValue('other');
    await user.selectOptions(typeSelect, 'itinerary');
    
    // CONTEXT: Edit title
    const titleInput = screen.getByDisplayValue('test');
    await user.clear(titleInput);
    await user.type(titleInput, 'My Test Document');
    
    expect(titleInput).toHaveValue('My Test Document');
  });

  it('should remove files from upload list', async () => {
    const user = userEvent.setup();
    render(<TourDocUploader {...mockProps} />);
    
    // CONTEXT: Add a file first
    const fileInput = screen.getByRole('button', { name: /choose files/i });
    await user.click(fileInput);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('Files to Upload (1)')).toBeInTheDocument();
    });
    
    // CONTEXT: Remove the file
    const removeButton = screen.getByRole('button', { name: /remove/i });
    await user.click(removeButton);
    
    expect(screen.queryByText('Files to Upload')).not.toBeInTheDocument();
  });

  it('should upload files successfully', async () => {
    const { uploadTourDocument } = await import('@/app/(shared)/documents/_actions');
    vi.mocked(uploadTourDocument).mockResolvedValue({ success: true, documentId: 'doc-123' });
    
    const user = userEvent.setup();
    render(<TourDocUploader {...mockProps} />);
    
    // CONTEXT: Add a file first
    const fileInput = screen.getByRole('button', { name: /choose files/i });
    await user.click(fileInput);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('Files to Upload (1)')).toBeInTheDocument();
    });
    
    // CONTEXT: Upload the file
    const uploadButton = screen.getByRole('button', { name: /upload 1 document/i });
    await user.click(uploadButton);
    
    await waitFor(() => {
      expect(uploadTourDocument).toHaveBeenCalledWith({
        projectId: 'project-123',
        file: expect.any(File),
        kind: 'other',
        title: 'test'
      });
    });
    
    expect(mockProps.onUploadSuccess).toHaveBeenCalled();
  });

  it('should handle upload errors', async () => {
    const { uploadTourDocument } = await import('@/app/(shared)/documents/_actions');
    vi.mocked(uploadTourDocument).mockRejectedValue(new Error('Upload failed'));
    
    const user = userEvent.setup();
    render(<TourDocUploader {...mockProps} />);
    
    // CONTEXT: Add a file first
    const fileInput = screen.getByRole('button', { name: /choose files/i });
    await user.click(fileInput);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('Files to Upload (1)')).toBeInTheDocument();
    });
    
    // CONTEXT: Upload the file
    const uploadButton = screen.getByRole('button', { name: /upload 1 document/i });
    await user.click(uploadButton);
    
    await waitFor(() => {
      expect(uploadTourDocument).toHaveBeenCalled();
    });
    
    // CONTEXT: Should not call success callback on error
    expect(mockProps.onUploadSuccess).not.toHaveBeenCalled();
  });
});

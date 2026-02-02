'use client';

import { useRef } from 'react';
import { useBooks } from '@/lib/hooks/use-books';
import { Button } from '@/components/ui/button';
import { Upload, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadButtonProps {
  variant?: 'default' | 'shelf';
  size?: 'default' | 'sm' | 'lg';
}

export function UploadButton({ variant = 'default', size = 'sm' }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadBooks, isUploading } = useBooks();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    // Filter and validate files
    const files: File[] = [];
    const invalidFiles: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.name.toLowerCase().endsWith('.epub')) {
        files.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    }

    if (invalidFiles.length > 0) {
      alert(`The following files are not EPUB files and will be skipped:\n${invalidFiles.join('\n')}`);
    }

    if (files.length === 0) return;

    // Reset file input immediately so the same files can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      await uploadBooks(files);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const isShelf = variant === 'shelf';

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading}
      />

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        size={size}
        className={cn(
          isShelf && 'h-10 bg-amber-900/80 hover:bg-amber-800 text-amber-100 border border-amber-700/50 shadow-lg'
        )}
      >
        {isShelf ? (
          <Plus className="w-4 h-4 mr-2" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        {size === 'lg' ? 'Add Books' : 'Add'}
      </Button>
    </div>
  );
}

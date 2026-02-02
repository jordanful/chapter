'use client';

import { useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { X, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateWatchedFolder } from '@/lib/hooks/use-library';

interface AddFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddFolderDialog({ isOpen, onClose }: AddFolderDialogProps) {
  const [path, setPath] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const createFolder = useCreateWatchedFolder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!path.trim()) {
      setError('Path is required');
      return;
    }

    if (!path.startsWith('/')) {
      setError('Path must be absolute (start with /)');
      return;
    }

    try {
      await createFolder.mutateAsync({
        path: path.trim(),
        name: name.trim() || undefined,
      });
      setPath('');
      setName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add folder');
    }
  };

  const handleClose = () => {
    setPath('');
    setName('');
    setError('');
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border rounded-xl shadow-lg w-full max-w-lg z-50">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold">Add Library Folder</Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground">
                  Add a folder to watch for EPUB files
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close className="rounded-lg p-2 hover:bg-accent" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="path">Folder Path *</Label>
              <Input
                id="path"
                type="text"
                placeholder="/app/data/books/library"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Absolute path to a folder containing EPUB files (e.g., /app/data/books/library)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Friendly Name (optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="My Books"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A friendly name to identify this folder
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createFolder.isPending}>
                {createFolder.isPending ? 'Adding...' : 'Add Folder'}
              </Button>
            </div>
          </form>
        </div>
      </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

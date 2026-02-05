'use client';

import { useState } from 'react';
import { FolderOpen, Plus, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWatchedFolders, useScanAllFolders } from '@/lib/hooks/use-library';
import { FolderCard } from './folder-card';
import { AddFolderDialog } from './add-folder-dialog';

export function LibraryFolders() {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: folders, isLoading, error } = useWatchedFolders();
  const scanAll = useScanAllFolders();

  const handleScanAll = async () => {
    try {
      await scanAll.mutateAsync();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load folders</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  const hasFolders = folders && folders.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Watched Folders</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Automatically import books from filesystem folders
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {hasFolders && (
            <Button
              variant="outline"
              onClick={handleScanAll}
              disabled={scanAll.isPending}
              className="whitespace-nowrap"
            >
              {scanAll.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Scan All
                </>
              )}
            </Button>
          )}
          <Button className="whitespace-nowrap" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Folder
          </Button>
        </div>
      </div>

      {hasFolders ? (
        <div className="space-y-4">
          {folders.map((folder) => (
            <FolderCard key={folder.id} folder={folder} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <FolderOpen className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">No folders configured</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Add a folder to automatically scan and import EPUB files from your filesystem. Perfect
            for syncing with existing book collections.
          </p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Folder
          </Button>
        </div>
      )}

      <AddFolderDialog isOpen={showAddDialog} onClose={() => setShowAddDialog(false)} />
    </div>
  );
}

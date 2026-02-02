'use client';

import { useState } from 'react';
import { Folder, Loader2, AlertCircle, CheckCircle, Trash2, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeleteWatchedFolder, useScanFolder, useFolderScanStatus } from '@/lib/hooks/use-library';
import type { WatchedFolder } from '@chapter/types';
import { cn } from '@/lib/utils';

interface FolderCardProps {
  folder: WatchedFolder;
}

function formatDate(date: Date | null) {
  if (!date) return 'Never';
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function FolderCard({ folder }: FolderCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteFolder = useDeleteWatchedFolder();
  const scanFolder = useScanFolder();

  // Poll status while scanning
  const { data: status } = useFolderScanStatus(folder.id, folder.lastScanStatus === 'scanning');

  const isScanning = status?.status === 'scanning' || folder.lastScanStatus === 'scanning';
  const hasError = status?.status === 'error' || folder.lastScanStatus === 'error';

  const handleScan = async () => {
    try {
      await scanFolder.mutateAsync(folder.id);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleDelete = async () => {
    try {
      await deleteFolder.mutateAsync(folder.id);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              isScanning && "bg-blue-500/10",
              hasError && "bg-red-500/10",
              !isScanning && !hasError && "bg-primary/10"
            )}>
              {isScanning ? (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              ) : hasError ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : (
                <Folder className="w-5 h-5 text-primary" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">
                {folder.name || 'Unnamed Folder'}
              </h3>
              <p className="text-sm text-muted-foreground font-mono truncate">
                {folder.path}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mt-3">
            <div>
              <span className="text-muted-foreground">Books Found:</span>
              <span className="ml-2 font-medium">{folder.booksFound}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Imported:</span>
              <span className="ml-2 font-medium">{folder.booksImported}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Last Scan:</span>
              <span className="ml-2 font-medium">{formatDate(folder.lastScanAt)}</span>
            </div>
          </div>

          {hasError && folder.lastScanError && (
            <div className="mt-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded">
              {folder.lastScanError}
            </div>
          )}

          {isScanning && (
            <div className="mt-3 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scanning folder...</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleScan}
            disabled={isScanning || scanFolder.isPending}
          >
            {isScanning || scanFolder.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4 mr-2" />
                Scan Now
              </>
            )}
          </Button>

          {showDeleteConfirm ? (
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDelete}
                disabled={deleteFolder.isPending}
                className="text-red-500 hover:text-red-600 hover:border-red-500"
              >
                {deleteFolder.isPending ? 'Deleting...' : 'Confirm'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-muted-foreground hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

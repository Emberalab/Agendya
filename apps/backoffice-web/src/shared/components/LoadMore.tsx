import { Button } from './Button';

interface LoadMoreProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

// Shared "Cargar más" footer for cursor-paginated Backoffice lists.
export function LoadMore({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: LoadMoreProps) {
  if (!hasNextPage) return null;
  return (
    <div className="mt-3 flex justify-center">
      <Button
        variant="outline"
        size="sm"
        onClick={onLoadMore}
        disabled={isFetchingNextPage}
      >
        {isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
      </Button>
    </div>
  );
}

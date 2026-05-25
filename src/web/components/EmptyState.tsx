type EmptyStateProps = {
  message: string;
};

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <p className="py-12 text-center text-gray-500 dark:text-gray-400">{message}</p>
  );
}

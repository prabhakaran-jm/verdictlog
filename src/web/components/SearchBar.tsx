import { useState, type FormEvent } from 'react';
import { validateUsername } from '../lib/validateUsername';

type SearchBarProps = {
  onSearch: (username: string) => void;
  loading: boolean;
};

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = username.trim();
    const result = validateUsername(trimmed);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    onSearch(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Reddit username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          disabled={loading}
        />
        {error ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-[#d93900] px-4 py-2 text-sm font-medium text-white hover:bg-[#c23300] disabled:opacity-50 dark:bg-orange-600 dark:hover:bg-orange-700"
      >
        {loading ? 'Searching…' : 'Search'}
      </button>
    </form>
  );
}

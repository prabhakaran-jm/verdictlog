export type AppPage = 'search' | 'rules' | 'settings';

type NavBarProps = {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
};

const tabs: { id: AppPage; label: string }[] = [
  { id: 'search', label: 'Search' },
  { id: 'rules', label: 'Rules' },
  { id: 'settings', label: 'Settings' },
];

export function NavBar({ currentPage, onNavigate }: NavBarProps) {
  return (
    <nav className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onNavigate(tab.id)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            currentPage === tab.id
              ? 'bg-[#d93900] text-white dark:bg-orange-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

/** Shared form control styles — Reddit iframe light mode needs strong borders and fill. */

export const formLabelClass =
  'mb-1 block text-sm font-medium text-gray-800 dark:text-gray-200';

export const formInputClass =
  'w-full rounded-lg border-2 border-gray-400 bg-white px-3 py-2 text-gray-900 shadow-sm ring-1 ring-gray-200 placeholder:text-gray-500 focus:border-[#d93900] focus:outline-none focus:ring-2 focus:ring-[#d93900]/35 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70 dark:border-gray-500 dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-700 dark:placeholder:text-gray-400 dark:focus:border-orange-500 dark:focus:ring-orange-500/35';

export const formSelectClass = `${formInputClass} appearance-auto`;

export const formTextareaClass = `${formInputClass} min-h-[5rem] resize-y`;

export const formPanelClass =
  'space-y-3 rounded-lg border-2 border-gray-300 bg-gray-50 p-4 shadow-sm dark:border-gray-600 dark:bg-gray-800/80';

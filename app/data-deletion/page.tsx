import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Deletion — EPCC Social Management',
  description: 'How to delete data from the Eastern Province Chamber of Commerce social-media tool.',
};

// Public Data Deletion Instructions page. Meta App Review requires either a Data
// Deletion Callback or a Data Deletion Instructions URL (App Dashboard → Settings
// → Basic). This URL is: {APP_BASE_URL}/data-deletion
export default function DataDeletion() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 font-Poppins text-text-dark">
      <h1 className="font-Sora text-2xl font-bold">Data Deletion Instructions</h1>
      <p className="mt-1 text-sm text-neutral-500">Eastern Province Chamber of Commerce — Social Media Management Tool</p>

      <section className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-neutral-700">
        <p>
          This tool is used internally by the Eastern Province Chamber of Commerce. It stores access tokens and cached
          analytics only for social-media accounts that Chamber staff explicitly connect. You can remove this data at
          any time.
        </p>

        <div>
          <h2 className="font-Sora text-base font-semibold text-text-dark">Option 1 — Disconnect in the app</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Open the <span className="font-medium">Accounts</span> screen.</li>
            <li>Find the connected Facebook or Instagram account.</li>
            <li>Click <span className="font-medium">Disconnect</span>.</li>
          </ol>
          <p className="mt-2">
            Disconnecting immediately deletes the account’s stored access token and its cached data from our database.
          </p>
        </div>

        <div>
          <h2 className="font-Sora text-base font-semibold text-text-dark">Option 2 — Request deletion by email</h2>
          <p className="mt-2">
            Send a deletion request to <span className="font-medium">privacy@chamber.org.sa</span> with the name of the
            account or Page. We will delete all associated tokens and cached data within 30 days and confirm by reply.
          </p>
        </div>

        <p className="text-neutral-600">
          We do not retain data about individual members of the public. Public peer-page and hashtag content is cached
          only temporarily and is not associated with any individual.
        </p>
      </section>
    </main>
  );
}

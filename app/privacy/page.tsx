import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — EPCC Social Management',
  description: 'How the Eastern Province Chamber of Commerce social-media management tool handles data.',
};

// Public Privacy Policy page. Meta App Review requires a reachable Privacy Policy
// URL (App Dashboard → Settings → Basic). This URL is: {APP_BASE_URL}/privacy
export default function PrivacyPolicy() {
  const updated = 'June 2026';
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 font-Poppins text-text-dark">
      <h1 className="font-Sora text-2xl font-bold">Privacy Policy</h1>
      <p className="mt-1 text-sm text-neutral-500">Eastern Province Chamber of Commerce — Social Media Management Tool · Last updated {updated}</p>

      <section className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-neutral-700">
        <div>
          <h2 className="font-Sora text-base font-semibold text-text-dark">1. Who we are</h2>
          <p className="mt-2">
            This tool is an internal social-media management dashboard operated by the Eastern Province Chamber of
            Commerce (“the Chamber”, “we”). It is used only by authorized Chamber staff to manage the Chamber’s own
            social-media presence and to benchmark it against publicly available data from peer organizations.
          </p>
        </div>

        <div>
          <h2 className="font-Sora text-base font-semibold text-text-dark">2. Data we access</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><span className="font-medium">Connected accounts:</span> when a staff member connects the Chamber’s Facebook Page or Instagram Business account, we receive access tokens and read the account’s own posts, insights, comments, and audience statistics through the Meta Graph API.</li>
            <li><span className="font-medium">Public page data:</span> with Meta’s “Page Public Content Access” feature, we read public information (follower counts, public posts and engagement) of a small, fixed list of peer business and chamber Pages, solely to benchmark the Chamber’s performance within the same category.</li>
            <li><span className="font-medium">Public hashtag content:</span> via the Instagram Hashtag Search API we read public posts associated with hashtags relevant to the Chamber.</li>
          </ul>
          <p className="mt-2">We do not collect data from individual private users, and we do not use this tool for advertising or profiling of individuals.</p>
        </div>

        <div>
          <h2 className="font-Sora text-base font-semibold text-text-dark">3. How we use data</h2>
          <p className="mt-2">
            Data is used only to display analytics, manage and publish the Chamber’s content, respond to comments on
            the Chamber’s own posts, and benchmark performance against peer organizations. Access is restricted to
            authorized Chamber staff. We never sell data or share it with third parties for their own purposes.
          </p>
        </div>

        <div>
          <h2 className="font-Sora text-base font-semibold text-text-dark">4. Storage &amp; retention</h2>
          <p className="mt-2">
            Connected-account tokens and cached analytics are stored in a managed Postgres database (Neon) used only by
            this application. Public peer-page and hashtag data is cached temporarily to reduce API calls. We retain
            data only as long as needed for the purposes above; disconnecting an account removes its stored tokens.
          </p>
        </div>

        <div>
          <h2 className="font-Sora text-base font-semibold text-text-dark">5. Deleting your data</h2>
          <p className="mt-2">
            A connected account can be disconnected at any time from the Accounts screen, which deletes its stored
            tokens and cached data. To request full deletion of any data associated with your account, see our{' '}
            <a href="/data-deletion" className="font-medium text-primary-800 hover:underline">Data Deletion Instructions</a>.
          </p>
        </div>

        <div>
          <h2 className="font-Sora text-base font-semibold text-text-dark">6. Compliance</h2>
          <p className="mt-2">
            Our use of the Meta Graph API complies with the Meta Platform Terms and Developer Policies. We do not scrape
            Meta properties and access public page data only through approved Meta API features.
          </p>
        </div>

        <div>
          <h2 className="font-Sora text-base font-semibold text-text-dark">7. Contact</h2>
          <p className="mt-2">
            Questions about this policy: <span className="font-medium">privacy@chamber.org.sa</span> · Eastern Province
            Chamber of Commerce, Dammam, Saudi Arabia.
          </p>
        </div>
      </section>
    </main>
  );
}

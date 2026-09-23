import Link from 'next/link';

export const metadata = {
  title: 'Privacy | Myles',
  description: 'Privacy information for the Myles portfolio website.',
};

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <div className="privacy-card">
        <Link href="/" className="admin-back">← Back to portfolio</Link>
        <span className="eyebrow">PRIVACY</span>
        <h1>Privacy, without the fog.</h1>
        <p>This portfolio uses first-party analytics to understand how the site is used and which project or contact actions are getting attention.</p>
        <h2>What is collected</h2>
        <p>Analytics events can include the page visited, interaction type, device category, browser, operating system, approximate location signals supplied by the hosting platform, referrer, timestamps and the visitor IP address.</p>
        <h2>IP addresses</h2>
        <p>IP addresses collected for analytics are encrypted before being stored in the portfolio database. The private admin dashboard can reveal the complete address to authenticated administrators when needed for visitor reference or troubleshooting.</p>
        <h2>Why it is used</h2>
        <p>The information is used for site analytics, understanding enquiries and improving the portfolio experience. It is not displayed publicly.</p>
        <h2>Contact</h2>
        <p>If you have a privacy question about this site, email <a href="mailto:chatmoralesgpt@gmail.com">chatmoralesgpt@gmail.com</a>.</p>
        <p className="privacy-note">Before production launch, the site owner should set and publish an appropriate data-retention period for analytics records and update this notice if the collection practices change.</p>
      </div>
    </main>
  );
}

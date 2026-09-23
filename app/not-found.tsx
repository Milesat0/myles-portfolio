import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="not-found">
      <div className="not-found-card">
        <span className="eyebrow">404 / ROUTE NOT FOUND</span>
        <h1>Looks like this page<br /><span>got lost.</span></h1>
        <p>The route you requested does not exist. The useful stuff is still over at home base.</p>
        <Link className="button primary" href="/">Back to portfolio <span aria-hidden="true">↗</span></Link>
      </div>
    </main>
  );
}

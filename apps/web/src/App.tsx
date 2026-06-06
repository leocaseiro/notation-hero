import { starRating } from "@core/scoring";

const DEMO_ACCURACY = 84;

export default function App() {
  const stars = starRating(DEMO_ACCURACY);
  return (
    <main>
      <h1>NotationHero</h1>
      <p>Learn and practice drums — a spiritual successor to the classic standalone drum-tutor.</p>
      <p aria-label={`${stars} of 5 stars`}>
        {"★".repeat(stars)}
        {"☆".repeat(5 - stars)} ({DEMO_ACCURACY}%)
      </p>
    </main>
  );
}

import { redirect } from 'next/navigation';

// Composing happens inside the Posts workspace; keep the old route working.
export default function Page() {
  redirect('/epcc-demo/posts');
}

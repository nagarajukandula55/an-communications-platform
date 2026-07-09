export function ComingSoon({ title, reason }: { title: string; reason: string }) {
  return (
    <main>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-4 text-sm text-slate-500">{reason}</p>
    </main>
  );
}

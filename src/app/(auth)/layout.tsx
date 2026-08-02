export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr] bg-background lg:grid-cols-[1.05fr_1fr] lg:grid-rows-1">
      <aside className="relative isolate flex h-44 flex-col justify-end overflow-hidden bg-brand-950 px-6 pb-7 sm:h-52 sm:px-10 lg:h-auto lg:justify-center lg:px-16 lg:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-28 -right-24 size-[26rem] sm:size-[32rem] lg:-top-20 lg:-right-40 lg:size-[46rem]"
        >
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <div className="absolute inset-[13%] rounded-full border border-white/10" />
          <div className="absolute inset-[27%] rounded-full border border-white/[0.07]" />
          <div className="absolute inset-[41%] rounded-full border border-white/[0.05]" />
          <div className="absolute inset-0 animate-spin rounded-full bg-[conic-gradient(from_0deg,transparent_240deg,var(--color-brand-500)_360deg)] opacity-25 [animation-duration:9s] motion-reduce:animate-none" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-brand-500/20 blur-3xl"
        />

        <div className="relative max-w-md">
          <span className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Radar</span>
          <p className="mt-1 text-sm font-medium text-brand-200">Presença escolar no contra-turno</p>
          <p className="mt-5 hidden text-sm leading-relaxed text-white/60 lg:block">
            Chamada rápida no celular para os professores. Frequência, absenteísmo e desempenho em
            painéis para a coordenação.
          </p>
        </div>
      </aside>

      <main className="flex items-start justify-center px-6 pt-12 pb-16 sm:px-10 lg:items-center lg:py-20">
        {children}
      </main>
    </div>
  );
}

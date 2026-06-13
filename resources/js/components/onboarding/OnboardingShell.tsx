export function OnboardingShell({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-background flex min-h-svh flex-col items-center px-4 py-8">
            <div className="flex w-full max-w-lg flex-col gap-4">
                <section className="flex flex-col items-center gap-4 py-2 text-center">
                    <div className="bg-muted/50 flex size-20 items-center justify-center overflow-hidden rounded-full border p-3 shadow-sm">
                        <img
                            src="/img/bookzy-icon-partner.svg"
                            alt="Bookzy"
                            className="max-h-full max-w-full object-contain"
                        />
                    </div>

                    <div className="space-y-1">
                        <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                            Bookzy
                        </p>
                        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                        <p className="text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed">{subtitle}</p>
                    </div>
                </section>

                <section className="border-border bg-card space-y-4 rounded-2xl border p-4 shadow-sm">{children}</section>
            </div>
        </div>
    );
}

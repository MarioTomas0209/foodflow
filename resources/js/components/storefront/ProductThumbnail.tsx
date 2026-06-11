import { cn } from '@/lib/utils';

interface ProductThumbnailProps {
    image?: string | null;
    name: string;
    className?: string;
}

export function ProductThumbnail({ image, name, className }: ProductThumbnailProps) {
    return (
        <div
            className={cn(
                'bg-muted flex shrink-0 items-center justify-center overflow-hidden rounded-lg border',
                className ?? 'size-12',
            )}
        >
            {image ? (
                <img src={image} alt={name} className="size-full object-cover" />
            ) : (
                <span className="text-muted-foreground text-base font-semibold">{name.charAt(0).toUpperCase()}</span>
            )}
        </div>
    );
}

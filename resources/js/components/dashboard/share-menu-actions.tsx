import { ExternalLink } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

interface ShareMenuActionsProps {
    slug: string;
}

export function ShareMenuActions({ slug }: ShareMenuActionsProps) {
    const [copied, setCopied] = useState(false);

    const menuUrl = `${window.location.origin}/${slug}`;

    const copyLink = async () => {
        await navigator.clipboard.writeText(menuUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={copyLink}>
                {copied ? '¡Copiado!' : 'Copiar link'}
            </Button>
            <Button asChild variant="outline">
                <a href={menuUrl} target="_blank" rel="noopener noreferrer">
                    Ver menú
                    <ExternalLink className="size-4" />
                </a>
            </Button>
        </div>
    );
}

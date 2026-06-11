import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

export default function InputError({
    message,
    className = '',
    ...props
}: HTMLAttributes<HTMLParagraphElement> & { message?: string | string[] }) {
    const text = Array.isArray(message) ? message[0] : message;

    return text ? (
        <p {...props} className={cn('text-sm text-red-600 dark:text-red-400', className)}>
            {text}
        </p>
    ) : null;
}

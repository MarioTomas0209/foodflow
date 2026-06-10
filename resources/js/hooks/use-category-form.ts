import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';

export function useCategoryForm() {
    const [open, setOpen] = useState(false);

    const { data, setData, post, processing, errors, wasSuccessful, reset } = useForm({
        name: '',
        description: '',
    });

    useEffect(() => {
        if (wasSuccessful) {
            setOpen(false);
            reset();
        }
    }, [wasSuccessful, reset]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('dashboard.menu.categories.store'));
    };

    return {
        open,
        setOpen,
        submit,
        data,
        setData,
        processing,
        errors,
    };
}

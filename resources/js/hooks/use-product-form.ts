import { useForm } from '@inertiajs/react';
import { FormEventHandler, useCallback, useEffect, useState } from 'react';

interface ProductModalState {
    open: boolean;
    categoryId: string | null;
}

export function useProductForm() {
    const [modal, setModal] = useState<ProductModalState>({ open: false, categoryId: null });

    const { data, setData, post, processing, errors, wasSuccessful, reset } = useForm({
        name: '',
        description: '',
        price: '',
        category_id: '',
        is_active: true,
    });

    const close = useCallback(() => {
        setModal({ open: false, categoryId: null });
        reset();
    }, [reset]);

    useEffect(() => {
        if (wasSuccessful) {
            close();
        }
    }, [wasSuccessful, close]);

    const openForCategory = (categoryId: string) => {
        setModal({ open: true, categoryId });
        setData((current) => ({ ...current, category_id: categoryId }));
    };

    const setOpen = (isOpen: boolean) => {
        if (isOpen) {
            setModal((current) => ({ ...current, open: true }));
        } else {
            close();
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('dashboard.menu.products.store'));
    };

    return {
        open: modal.open,
        categoryId: modal.categoryId,
        setOpen,
        openForCategory,
        close,
        submit,
        data,
        setData,
        processing,
        errors,
    };
}

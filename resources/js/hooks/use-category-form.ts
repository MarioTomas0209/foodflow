import { useForm } from '@inertiajs/react';
import { FormEventHandler, useCallback, useEffect, useState } from 'react';

import { formatHourLabel } from '@/lib/business-hours';
import { categoryHasSchedule } from '@/lib/category-schedule';
import { type Category, type CategoryScheduleType } from '@/types';

export interface CategoryFormData {
    name: string;
    description: string;
    is_active: boolean;
    has_schedule: boolean;
    schedule_type: CategoryScheduleType;
    available_from: string;
    available_until: string;
    available_days: number[];
    [key: string]: string | boolean | number[];
}

interface CategoryModalState {
    open: boolean;
    mode: 'create' | 'edit';
    categoryId: string | null;
}

const defaultFormState: CategoryFormData = {
    name: '',
    description: '',
    is_active: true,
    has_schedule: false,
    schedule_type: 'informative',
    available_from: '08:00',
    available_until: '11:00',
    available_days: [1, 2, 3, 4, 5],
};

const initialModalState: CategoryModalState = {
    open: false,
    mode: 'create',
    categoryId: null,
};

function categoryToFormState(category: Category): CategoryFormData {
    return {
        name: category.name,
        description: category.description ?? '',
        is_active: category.is_active,
        has_schedule: categoryHasSchedule(category),
        schedule_type: category.schedule_type ?? 'informative',
        available_from: category.available_from ? formatHourLabel(category.available_from) : '08:00',
        available_until: category.available_until ? formatHourLabel(category.available_until) : '11:00',
        available_days: category.available_days ?? [1, 2, 3, 4, 5],
    };
}

export function useCategoryForm() {
    const [modal, setModal] = useState<CategoryModalState>(initialModalState);

    const { data, setData, post, put, processing, errors, wasSuccessful, reset, transform } =
        useForm<CategoryFormData>({ ...defaultFormState });

    const close = useCallback(() => {
        setModal(initialModalState);
        reset();
    }, [reset]);

    useEffect(() => {
        if (wasSuccessful) {
            close();
        }
    }, [wasSuccessful, close]);

    transform((formData) => ({
        name: formData.name,
        description: formData.description || null,
        is_active: formData.is_active,
        schedule_type: formData.has_schedule ? formData.schedule_type : 'informative',
        available_from: formData.has_schedule ? formData.available_from : null,
        available_until: formData.has_schedule ? formData.available_until : null,
        available_days: formData.has_schedule ? formData.available_days : null,
    }));

    const openForCreate = () => {
        reset();
        setModal({ open: true, mode: 'create', categoryId: null });
        setData({ ...defaultFormState });
    };

    const openForEdit = (category: Category) => {
        reset();
        setModal({ open: true, mode: 'edit', categoryId: category.id });
        setData(categoryToFormState(category));
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            close();
            return;
        }

        setModal((current) => ({ ...current, open: true }));
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (modal.mode === 'edit' && modal.categoryId) {
            put(route('dashboard.menu.categories.update', modal.categoryId));
            return;
        }

        post(route('dashboard.menu.categories.store'));
    };

    const toggleDay = (day: number, checked: boolean) => {
        const days = new Set(data.available_days);

        if (checked) {
            days.add(day);
        } else {
            days.delete(day);
        }

        setData('available_days', Array.from(days).sort((a, b) => a - b));
    };

    return {
        open: modal.open,
        mode: modal.mode,
        openForCreate,
        openForEdit,
        handleOpenChange,
        submit,
        data,
        setData,
        toggleDay,
        processing,
        errors,
    };
}

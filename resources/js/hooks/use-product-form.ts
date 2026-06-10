import { useForm } from '@inertiajs/react';
import { FormEventHandler, useCallback, useState } from 'react';

import { useNamedRoute } from '@/lib/ziggy';
import { type Product } from '@/types';

interface ProductModalState {
    open: boolean;
    mode: 'create' | 'edit';
    categoryId: string | null;
    productId: string | null;
}

export interface ProductVariantInput {
    name: string;
    price: string;
    [key: string]: string;
}

export interface ProductFormData {
    name: string;
    description: string;
    price: string;
    category_id: string;
    is_active: boolean;
    has_variants: boolean;
    variants: ProductVariantInput[];
    [key: string]: string | boolean | ProductVariantInput[];
}

const initialFormData: ProductFormData = {
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_active: true,
    has_variants: false,
    variants: [],
};

const initialModalState: ProductModalState = {
    open: false,
    mode: 'create',
    categoryId: null,
    productId: null,
};

function validateVariants(data: ProductFormData): string | null {
    if (!data.has_variants) {
        return null;
    }

    if (data.variants.length === 0) {
        return 'Agrega al menos una variante.';
    }

    const hasIncompleteVariant = data.variants.some(
        (variant) => !variant.name.trim() || variant.price === '' || Number(variant.price) < 0,
    );

    if (hasIncompleteVariant) {
        return 'Completa el nombre y precio de cada variante.';
    }

    return null;
}

export function useProductForm() {
    const [modal, setModal] = useState<ProductModalState>(initialModalState);
    const [variantError, setVariantError] = useState<string | null>(null);
    const namedRoute = useNamedRoute();

    const form = useForm<ProductFormData>(initialFormData);
    const { data, setData, post, put, processing, errors, reset, clearErrors, transform } = form;

    const close = useCallback(() => {
        setModal(initialModalState);
        setVariantError(null);
        reset();
    }, [reset]);

    transform((formData) => ({
        ...formData,
        price: formData.has_variants ? '0' : formData.price,
        variants: formData.has_variants ? formData.variants : [],
    }));

    const openForCategory = (categoryId: string) => {
        reset();
        setVariantError(null);
        setModal({ open: true, mode: 'create', categoryId, productId: null });
        setData({ ...initialFormData, category_id: categoryId });
    };

    const openForEdit = (product: Product) => {
        reset();
        setVariantError(null);
        setModal({
            open: true,
            mode: 'edit',
            categoryId: product.category_id,
            productId: product.id,
        });
        setData({
            name: product.name,
            description: product.description ?? '',
            price: product.has_variants ? '0' : String(product.price),
            category_id: product.category_id ?? '',
            is_active: product.is_active,
            has_variants: product.has_variants,
            variants: product.has_variants
                ? product.variants.map((variant) => ({
                      name: variant.name,
                      price: String(variant.price),
                  }))
                : [],
        });
    };

    const setOpen = (isOpen: boolean) => {
        if (isOpen) {
            setModal((current) => ({ ...current, open: true }));
        } else {
            close();
        }
    };

    const setHasVariants = (hasVariants: boolean) => {
        setVariantError(null);
        clearErrors('variants', 'price');
        setData((current) => ({
            ...current,
            has_variants: hasVariants,
            price: hasVariants ? '0' : current.price === '0' ? '' : current.price,
            variants: hasVariants
                ? current.variants.length > 0
                    ? current.variants
                    : [{ name: '', price: '' }]
                : [],
        }));
    };

    const addVariant = () => {
        setVariantError(null);
        setData((current) => ({
            ...current,
            variants: [...current.variants, { name: '', price: '' }],
        }));
    };

    const removeVariant = (index: number) => {
        setVariantError(null);
        setData((current) => ({
            ...current,
            variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
        }));
    };

    const updateVariant = (index: number, field: keyof ProductVariantInput, value: string) => {
        setVariantError(null);
        setData((current) => ({
            ...current,
            variants: current.variants.map((variant, variantIndex) =>
                variantIndex === index ? { ...variant, [field]: value } : variant,
            ),
        }));
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const validationError = validateVariants(data);

        if (validationError) {
            setVariantError(validationError);
            return;
        }

        setVariantError(null);

        const requestOptions = {
            preserveScroll: true,
            onSuccess: () => close(),
        };

        if (modal.mode === 'edit' && modal.productId) {
            put(namedRoute('dashboard.menu.products.update', modal.productId), requestOptions);
            return;
        }

        post(namedRoute('dashboard.menu.products.store'), requestOptions);
    };

    return {
        open: modal.open,
        mode: modal.mode,
        categoryId: modal.categoryId,
        setOpen,
        openForCategory,
        openForEdit,
        close,
        submit,
        data,
        setData,
        processing,
        errors,
        variantError,
        setHasVariants,
        addVariant,
        removeVariant,
        updateVariant,
    };
}

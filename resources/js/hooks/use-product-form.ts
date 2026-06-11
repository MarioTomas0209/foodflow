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
    stock: string;
    [key: string]: string;
}

export interface ProductFormData {
    name: string;
    description: string;
    price: string;
    stock: string;
    category_id: string;
    is_active: boolean;
    has_variants: boolean;
    variants: ProductVariantInput[];
    image: File | null;
    [key: string]: string | boolean | ProductVariantInput[] | File | null;
}

const initialFormData: ProductFormData = {
    name: '',
    description: '',
    price: '',
    stock: '',
    category_id: '',
    is_active: true,
    has_variants: false,
    variants: [],
    image: null,
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
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
    const namedRoute = useNamedRoute();

    const form = useForm<ProductFormData>(initialFormData);
    const { data, setData, post, processing, errors, reset, clearErrors, transform } = form;

    const close = useCallback(() => {
        setModal(initialModalState);
        setVariantError(null);
        setCurrentImageUrl(null);
        reset();
    }, [reset]);

    transform((formData) => {
        const transformed: Record<string, unknown> = {
            ...formData,
            price: formData.has_variants ? '0' : formData.price,
            stock: formData.has_variants || formData.stock === '' ? null : Number(formData.stock),
            variants: formData.has_variants
                ? formData.variants.map((variant) => ({
                      name: variant.name,
                      price: variant.price,
                      stock: variant.stock === '' ? null : Number(variant.stock),
                  }))
                : [],
        };

        if (!formData.image) {
            delete transformed.image;
        }

        return transformed;
    });

    const openForCategory = (categoryId: string) => {
        reset();
        setVariantError(null);
        setCurrentImageUrl(null);
        setModal({ open: true, mode: 'create', categoryId, productId: null });
        setData({ ...initialFormData, category_id: categoryId });
    };

    const openForEdit = (product: Product) => {
        reset();
        setVariantError(null);
        setCurrentImageUrl(product.image ?? null);
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
            stock: product.has_variants ? '' : product.stock !== null ? String(product.stock) : '',
            category_id: product.category_id ?? '',
            is_active: product.is_active,
            has_variants: product.has_variants,
            variants: product.has_variants
                ? product.variants.map((variant) => ({
                      name: variant.name,
                      price: String(variant.price),
                      stock: variant.stock !== null ? String(variant.stock) : '',
                  }))
                : [],
            image: null,
        });
    };

    const setOpen = (isOpen: boolean) => {
        if (isOpen) {
            setModal((current) => ({ ...current, open: true }));
        } else {
            close();
        }
    };

    const setImage = (file: File | null) => {
        setData('image', file);
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
                    : [{ name: '', price: '', stock: '' }]
                : [],
        }));
    };

    const addVariant = () => {
        setVariantError(null);
        setData((current) => ({
            ...current,
            variants: [...current.variants, { name: '', price: '', stock: '' }],
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

        const hasImage = data.image !== null;
        const requestOptions = {
            preserveScroll: true,
            ...(hasImage ? { forceFormData: true } : {}),
            onSuccess: () => close(),
        };

        if (modal.mode === 'edit' && modal.productId) {
            post(namedRoute('dashboard.menu.products.update', modal.productId), requestOptions);
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
        currentImageUrl,
        setImage,
        setHasVariants,
        addVariant,
        removeVariant,
        updateVariant,
    };
}

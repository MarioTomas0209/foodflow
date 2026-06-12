import { Head } from '@inertiajs/react';

import { CategoryCard } from '@/components/menu/category-card';
import { CreateCategoryDialog } from '@/components/menu/create-category-dialog';
import { MenuEmptyState } from '@/components/menu/menu-empty-state';
import { MenuHeader } from '@/components/menu/menu-header';
import { ProductFormDialog } from '@/components/menu/product-form-dialog';
import { useCategoryForm } from '@/hooks/use-category-form';
import { useProductForm } from '@/hooks/use-product-form';
import DashboardLayout from '@/layouts/DashboardLayout';
import { type Category } from '@/types';

interface MenuPageProps {
    categories: Category[];
}

export default function Index({ categories }: MenuPageProps) {
    const categoryForm = useCategoryForm();
    const productForm = useProductForm();

    const activeCategory = categories.find((category) => category.id === productForm.categoryId);

    return (
        <DashboardLayout>
            <Head title="Menú" />

            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                <MenuHeader showNewButton={categories.length > 0} onNewCategory={categoryForm.openForCreate} />

                {categories.length === 0 ? (
                    <MenuEmptyState onCreateCategory={categoryForm.openForCreate} />
                ) : (
                    <div className="flex flex-col gap-4">
                        {categories.map((category) => (
                            <CategoryCard
                                key={category.id}
                                category={category}
                                onAddProduct={productForm.openForCategory}
                                onEditProduct={productForm.openForEdit}
                                onEditCategory={categoryForm.openForEdit}
                            />
                        ))}
                    </div>
                )}
            </div>

            <CreateCategoryDialog
                open={categoryForm.open}
                mode={categoryForm.mode}
                onOpenChange={categoryForm.handleOpenChange}
                data={categoryForm.data}
                setData={categoryForm.setData}
                toggleDay={categoryForm.toggleDay}
                processing={categoryForm.processing}
                errors={categoryForm.errors}
                onSubmit={categoryForm.submit}
            />

            <ProductFormDialog
                open={productForm.open}
                mode={productForm.mode}
                onOpenChange={productForm.setOpen}
                categoryName={activeCategory?.name}
                data={productForm.data}
                currentImageUrl={productForm.currentImageUrl}
                setData={productForm.setData}
                onImageChange={productForm.setImage}
                processing={productForm.processing}
                errors={productForm.errors}
                variantError={productForm.variantError}
                onSetHasVariants={productForm.setHasVariants}
                onAddVariant={productForm.addVariant}
                onRemoveVariant={productForm.removeVariant}
                onUpdateVariant={productForm.updateVariant}
                onSubmit={productForm.submit}
                onClose={productForm.close}
            />
        </DashboardLayout>
    );
}

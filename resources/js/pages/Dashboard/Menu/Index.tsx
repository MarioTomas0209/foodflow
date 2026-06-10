import { Head } from '@inertiajs/react';

import DashboardLayout from '@/layouts/DashboardLayout';

interface Product {
    id: string;
    name: string;
    description: string | null;
    price: string;
    image: string | null;
    is_active: boolean;
    sort_order: number;
}

interface Category {
    id: string;
    name: string;
    description: string | null;
    sort_order: number;
    is_active: boolean;
    products: Product[];
}

interface MenuPageProps {
    categories: Category[];
}

export default function Index({ categories }: MenuPageProps) {
    return (
        <DashboardLayout>
            <Head title="Menú" />

            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Menú</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Administra las categorías y productos de tu negocio</p>
                </div>

                {categories.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Aún no tienes categorías. Crea la primera para empezar.</p>
                ) : (
                    <div className="flex flex-col gap-6">
                        {categories.map((category) => (
                            <section key={category.id} className="border-border rounded-lg border p-4">
                                <h2 className="text-lg font-semibold">{category.name}</h2>
                                {category.description && <p className="text-muted-foreground mt-1 text-sm">{category.description}</p>}

                                {category.products.length === 0 ? (
                                    <p className="text-muted-foreground mt-3 text-sm">Sin productos en esta categoría.</p>
                                ) : (
                                    <ul className="mt-3 flex flex-col gap-2">
                                        {category.products.map((product) => (
                                            <li key={product.id} className="flex items-center justify-between text-sm">
                                                <span>{product.name}</span>
                                                <span className="text-muted-foreground">
                                                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(product.price))}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

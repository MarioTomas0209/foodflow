<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Tests\TestCase;

class ProductValidationTest extends TestCase
{
    /**
     * @param  array<string, mixed>  $data
     * @return \Illuminate\Contracts\Validation\Validator
     */
    private function validateProduct(array $data): \Illuminate\Contracts\Validation\Validator
    {
        $hasVariants = filter_var($data['has_variants'] ?? false, FILTER_VALIDATE_BOOLEAN);

        return Validator::make($data, [
            'price' => [$hasVariants ? 'nullable' : 'required', 'numeric', 'min:0'],
            'has_variants' => ['boolean'],
            'variants' => [
                Rule::excludeIf(! $hasVariants),
                'required',
                'array',
                'min:1',
            ],
            'variants.*.name' => [
                Rule::excludeIf(! $hasVariants),
                'required',
                'string',
                'max:255',
            ],
            'variants.*.price' => [
                Rule::excludeIf(! $hasVariants),
                'required',
                'numeric',
                'min:0',
            ],
        ]);
    }

    public function test_fixed_price_allows_empty_variants_array(): void
    {
        $validator = $this->validateProduct([
            'price' => '10',
            'has_variants' => false,
            'variants' => [],
        ]);

        $this->assertFalse($validator->fails(), json_encode($validator->errors()->all()));
    }

    public function test_variants_required_when_has_variants_true(): void
    {
        $validator = $this->validateProduct([
            'price' => '0',
            'has_variants' => true,
            'variants' => [],
        ]);

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('variants', $validator->errors()->toArray());
    }
}

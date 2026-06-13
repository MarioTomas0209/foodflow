<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BusinessHoursController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $organization = auth()->user()->currentOrganization;

        $hours = collect($request->input('hours', []))
            ->map(function (array $hour) {
                if ($hour['is_closed'] ?? false) {
                    $hour['opens_at'] = null;
                    $hour['closes_at'] = null;
                }

                return $hour;
            })
            ->all();

        $request->merge(['hours' => $hours]);

        $validated = $request->validate([
            'hours' => ['required', 'array', 'size:7'],
            'hours.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'hours.*.opens_at' => ['nullable', 'date_format:H:i'],
            'hours.*.closes_at' => ['nullable', 'date_format:H:i'],
            'hours.*.is_closed' => ['boolean'],
        ]);

        foreach ($validated['hours'] as $index => $hour) {
            $isClosed = (bool) ($hour['is_closed'] ?? false);

            if (! $isClosed) {
                if (empty($hour['opens_at']) || empty($hour['closes_at'])) {
                    throw ValidationException::withMessages([
                        "hours.{$index}.opens_at" => 'Indica horario de apertura y cierre o marca el día como cerrado.',
                    ]);
                }

                if ($hour['closes_at'] <= $hour['opens_at']) {
                    throw ValidationException::withMessages([
                        "hours.{$index}.closes_at" => 'La hora de cierre debe ser posterior a la de apertura.',
                    ]);
                }
            }
        }

        foreach ($validated['hours'] as $hour) {
            $isClosed = (bool) ($hour['is_closed'] ?? false);

            $organization->hours()->updateOrCreate(
                ['day_of_week' => $hour['day_of_week']],
                [
                    'opens_at' => $isClosed
                        ? '08:00:00'
                        : $this->normalizeTime($hour['opens_at']),
                    'closes_at' => $isClosed
                        ? '20:00:00'
                        : $this->normalizeTime($hour['closes_at']),
                    'is_closed' => $isClosed,
                ],
            );
        }

        return redirect()
            ->route('dashboard.settings')
            ->with('success', 'Horarios actualizados correctamente.');
    }

    private function normalizeTime(string $time): string
    {
        return strlen($time) === 5 ? $time.':00' : $time;
    }
}

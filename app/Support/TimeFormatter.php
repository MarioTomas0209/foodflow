<?php

namespace App\Support;

use Carbon\Carbon;

class TimeFormatter
{
    public static function format12Hour(string $time): string
    {
        $normalized = strlen($time) <= 5 ? $time : substr($time, 0, 5);

        return strtolower(Carbon::createFromFormat('H:i', $normalized)->format('h:i a'));
    }
}
